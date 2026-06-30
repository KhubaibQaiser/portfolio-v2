# ADR 0001 — Cross-stack references: ARN patterns + SSM registry, not CloudFormation exports

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Khubaib (with AI pairing)

## Context

The infra is split into multiple CDK stacks (`Data`, `Web`, `Admin`, `Auth`,
`Shared`, plus edge `Dns`/`Cert`). Consumers need the DataStack's DynamoDB
tables + media bucket and the AuthStack's auth secrets.

Originally these were passed as **CDK construct references** across stacks
(`tables: ITable[]`, `mediaBucket: IBucket`, `auth: { userPoolId, ... }`). CDK
turns each cross-stack reference into a **CloudFormation export** (`Fn::ImportValue`).

That bit us during the single-table → multi-table migration: changing the
content table's key schema/name forces a **replacement**, which changes its
exported value. CloudFormation refuses to modify an export that another stack
imports:

```
Cannot update export Portfolio-Data:ExportsOutputRefContentTable… as it is in
use by Portfolio-Admin, Portfolio-Shared and Portfolio-Web.
```

The Data update failed and rolled back — a "deadly embrace." Any future schema
change to an exported resource would hit the same wall.

## Decision

**Remove all cross-stack CloudFormation exports.** Stacks reference each other's
resources by stable, decoupled handles:

1. **DynamoDB tables → deterministic ARN pattern (versionable-prefix convention).**
   Names are `${tablePrefix}-<suffix>`, with suffixes single-sourced from
   `@portfolio/data/tables` (`TABLE_SUFFIXES`) so the app, local/test
   create-table, and CDK can't drift. Consumers grant the whole set with one
   wildcard ARN — `arn:aws:dynamodb:<region>:<account>:table/${tablePrefix}-*`
   (+ `/index/*`) — via `naming.ts#grantAppDataAccess`. The app resolves the same
   names at runtime from `DYNAMO_TABLE_PREFIX`. `tablePrefix` is a **versionable
   knob**: bump it (e.g. `portfolio` → `portfolio-v2`) to stand up a fresh table
   set for a blue/green data migration.

2. **Media bucket → auto-generated name + SSM registry.** The bucket has no fixed
   `bucketName` (S3 names are global + immutable; a hardcoded one is the worst
   case for migration), so CloudFormation names it and it can be replaced
   cleanly. The DataStack publishes the name to SSM at
   `/<app>/data/media-bucket-name`; consumers read it with
   `valueForStringParameter` and grant `arn:aws:s3:::<name>` (+ `/*`).

3. **Auth secrets → SSM registry.** The AuthStack publishes complete ARNs for the
   Google OAuth JSON secret and the Better Auth signing secret to `/<app>/auth/*`;
   the AdminStack reads them at deploy time and grants the Lambda read access.

4. **Ordering without coupling.** `bin/portfolio.ts` uses `stack.addDependency`
   only to order `cdk deploy --all` (Data + Auth before consumers). This adds **no**
   export, so it never blocks a replacement.

The only remaining "hardcoded" strings are the **SSM paths** — an intentional
logical contract between stacks (like a DNS name), decoupled from any physical
resource.

### IAM principle

Every permission is written against an **ARN** (deterministic pattern for
DynamoDB/S3, or constructed from the SSM-discovered name), never against an
imported construct. For values held *inside* SSM/Secrets (an id, an API key) the
deterministic handle is the **name/path**; the grant that authorizes reading it
is still by ARN.

## Approaches considered

### A. Cross-stack construct references (CloudFormation exports) — *rejected*
- ✅ Zero extra code; CDK wires it automatically; deploy ordering inferred.
- ✅ Tightest type-safety (real `ITable`/`IBucket`).
- ❌ **Replacing/renaming an exported resource deadlocks** ("export in use").
- ❌ Migrations require destroying or temporarily decoupling consumers.

### B. Deterministic ARN pattern for tables — *chosen for DynamoDB*
- ✅ No exports; one wildcard grant covers the whole set (and future tables).
- ✅ App already resolves names by `DYNAMO_TABLE_PREFIX` → single env var.
- ✅ `tablePrefix` gives whole-data-layer blue/green migrations in one knob.
- ⚠️ Names are deterministic, so an *in-place* identity change still replaces;
  migration is at the **table-set** granularity (bump the prefix), not per-table.
- ⚠️ Wildcard grant is slightly broader than per-table ARNs (scoped to the
  prefix; acceptable).

### C. Auto-generated names + SSM registry — *chosen for bucket + auth secrets*
- ✅ Most migration-friendly: physical names float; repoint the SSM param.
- ✅ Right fit for S3 (immutable global names) and Secrets Manager ARNs.
- ❌ For a *set* of resources it means injecting many names and per-ARN grants;
  overkill for the 9 tables, so we don't use it there.

### D. Pure SSM registry for everything — *rejected (this round)*
- ✅ Uniform; per-resource independent migration.
- ❌ App would need all 9 table names injected (vs one prefix); per-ARN grants
  instead of a clean wildcard. More machinery than this portfolio warrants.

## Consequences

- **Positive:** schema/identity changes to any resource no longer deadlock; the
  data layer has a real blue/green migration story (`-c tablePrefix=...`); table
  names are single-sourced; IAM is uniformly ARN-based.
- **Negative / trade-offs:** consumers depend on the SSM paths existing at deploy
  time (handled by `addDependency` ordering); the table grant is a prefix
  wildcard rather than per-table ARNs; per-table independent migration would
  need approach D.
- **Operational:** changing the media bucket name is no longer possible in place
  (it's auto-named) — to move it, create a new bucket, repoint the SSM param, and
  copy objects.

## Out of scope / follow-ups

- **DNS → Cert (`hostedZone`)** is still a construct reference, but only when
  `domainEnabled` (currently off) and both live in `us-east-1`. When the domain
  is delegated, decouple via `HostedZone.fromHostedZoneAttributes` + an SSM
  `hosted-zone-id` param.
- **Runtime secrets** (LLM API keys): the `DataStack` **creates** the secret
  resources (so the set of keys the app needs is explicit in IaC, not discovered
  by grepping the code) and publishes each **complete ARN** (incl. the random
  suffix) to SSM (`/portfolio/ai/*-api-key-arn`). The apps import via
  `Secret.fromSecretCompleteArn(<ssm value>)`, `grantRead` (IAM scoped to that
  ARN), and pass the same complete ARN to the Lambda env (`GROQ_API_KEY_SECRET_ARN`,
  `ANTHROPIC_API_KEY_SECRET_ARN`). The app fetches values via `GetSecretValue` at
  request time. Values are injected out-of-band (`put-secret-value`) so plaintext
  never enters code/templates, and no partial ARN is ever hand-built. The secrets
  use `RemovalPolicy.DESTROY` (externally injected + trivially re-creatable, so
  they shouldn't outlive the stack); the deletion is scheduled with a recovery
  window, so reusing a name immediately needs
  `delete-secret --force-delete-without-recovery`. To exercise AI locally, copy
  the complete ARN from SSM and use AWS credentials.

- **Removal policy rule:** only the **DynamoDB content tables** and the **S3 media
  bucket** survive a `cdk destroy` (`RETAIN` + deletion protection / PITR);
  everything else is `DESTROY`, including auth secrets (values are re-injectable or
  auto-generated).
