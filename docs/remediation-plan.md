# Remediation Plan — Architecture Gaps

This plan addresses the gaps identified during the repository architecture review. It is ordered by risk and expected effort. Each item includes the current state, target state, implementation approach, verification, and rollout notes.

## Guiding principles

- Keep changes minimal and aligned with the existing ports-and-adapters design.
- Preserve local fixture-mode development without requiring AWS resources.
- Prefer explicit validation and authorization at application boundaries.
- Avoid adding infrastructure or recurring cost unless it directly reduces risk.
- Treat DynamoDB changes as production-affecting and test them against DynamoDB Local.

## Priority matrix

| Priority | Area                            | Risk                  | Effort | Owner area                         |
| -------- | ------------------------------- | --------------------- | ------ | ---------------------------------- |
| P0       | Authorization boundary audit    | High                  | Medium | `apps/admin`                       |
| P0       | Cost-cap atomicity              | High                  | Medium | `apps/admin`, `packages/data`      |
| P1       | Concurrent write protection     | Medium                | Medium | `packages/shared`, `packages/data` |
| P1       | Persistence boundary validation | Medium                | Medium | `packages/data`                    |
| P2       | IAM least privilege             | Medium                | Medium | `packages/infra`                   |
| P2       | Documentation drift             | Low                   | Low    | `README.md`, package comments      |
| P3       | Collection scan scalability     | Low now, higher later | Medium | `packages/data`, `packages/infra`  |

## P0 — Audit and enforce every admin mutation boundary

### Current state

Authorization is intentionally application-enforced through `requireAdmin()` in `apps/admin/src/lib/auth-guard.ts`. Middleware only checks for a Better Auth session cookie and excludes API routes. DynamoDB has no row-level security.

### Risk

Any mutation path that forgets `requireAdmin()` becomes publicly reachable. This is especially important because the authorization model depends on developers remembering to guard every server action and API route.

### Target state

Every admin mutation boundary has an explicit, auditable authorization check, and tests fail if an unguarded mutation path is added.

### Implementation

1. Inventory all mutation entry points:
   - Server actions in `apps/admin/src/lib/actions.ts`.
   - API routes under `apps/admin/src/app/api/**/route.ts`.
   - Any future route handlers or server actions added under the dashboard.
2. Add focused authorization tests for every mutating route/action:
   - No session → rejected.
   - Session with non-allowlisted email → rejected.
   - Allowlisted session → accepted.
3. Add a lightweight static guardrail:
   - Either a test/script that scans admin mutation files for `requireAdmin()`.
   - Or an internal convention enforced by lint/code review for files under mutation boundaries.
4. Keep middleware as UX/navigation protection only; do not rely on it for authorization.
5. Document this invariant in `apps/admin` documentation or `AGENTS.md` if added later.

### Verification

- `pnpm test`
- Add/extend route tests for API handlers.
- Confirm every mutation returns `401`/`403` without valid authorization.
- Confirm the static guardrail fails when a mutation omits `requireAdmin()`.

### Rollout

Low deployment risk. This can ship independently after tests pass.

---

## P0 — Make AI cost-cap checks and generation persistence atomic

### Current state

The cost cap checks usage through `sumDailyUsage()` before generation, then the app later persists the generation through `insertResumeGeneration()`. The check and write are separate operations.

Relevant files:

- `apps/admin/src/app/api/resume/generate/route.ts`
- `packages/data/src/adapters/content-cost-cap.ts`
- `packages/data/src/adapters/multi-table-content-repository.ts`
- `packages/shared/src/ports/content-repository.ts`

### Risk

Concurrent generation requests can all pass the usage check before any of them write usage, causing spend above the configured daily cap.

### Target state

The system reserves spend or enforces cap accounting atomically enough that concurrent requests cannot exceed the cap except by a documented bounded estimate.

### Recommended approach

Use a DynamoDB usage-reservation counter in the existing rate-limit/usage infrastructure rather than attempting a broad transaction across generated output records.

1. Add a per-user daily usage reservation mechanism:
   - Key by user and UTC day/window.
   - Store reserved and optionally finalized spend.
   - Use `UpdateCommand` with a condition expression so the counter increments only when the updated total remains within the cap.
2. Reserve an estimated maximum cost before invoking the model.
3. After generation completes, reconcile the reservation:
   - Decrease the reservation if actual spend is lower.
   - Keep actual spend if it matches the estimate.
4. Persist the generation history as an audit record, but do not make it the source of truth for cap enforcement.
5. On model failure or timeout, release the reservation in a `finally`-style cleanup path.
6. Add TTL to reservation records so stale/abandoned reservations do not accumulate forever.

### Alternative considered

Use DynamoDB transactions across a generation-history write and usage counter. This is stronger but more operationally complex, costs more, and requires restructuring the current ports. The reservation counter is simpler and fits the existing rate-limit table pattern.

### Verification

- Unit tests for successful reservation, rejection at cap, reconciliation, and failure release.
- Integration tests against DynamoDB Local simulating concurrent calls.
- Route-level tests asserting generation is blocked before model invocation when cap is exceeded.

### Rollout

Deploy data changes first, then app changes. Because this adds new counter records, existing generation history remains valid for reporting but should no longer be the enforcement source.

---

## P1 — Add optimistic concurrency protection to content writes

### Current state

Most writes are read-modify-write operations:

- Singleton upserts merge the current item with a patch.
- Collection updates read the row, merge values, then write the full row.

Relevant files:

- `packages/data/src/adapters/multi-table-content-repository.ts`
- `packages/data/src/adapters/fixture-content-repository.ts`

### Risk

Two admins, or two browser tabs from the same admin, can overwrite each other’s changes silently.

### Target state

Writes detect stale edits and surface a conflict instead of silently losing data.

### Implementation

1. Add a version/revision field to mutable records:
   - `revision: number`
   - Continue maintaining `updated_at`.
2. Extend update contracts where needed so admin forms can submit the loaded revision.
3. In DynamoDB writes, use conditional updates:
   - `ConditionExpression: "attribute_exists(id) AND revision = :expectedRevision"`
   - Increment `revision` atomically on write.
4. For singleton upserts, require a conditional `PutItem` or `UpdateItem` when the item already exists.
5. In the admin UI, map conditional failures to a clear conflict response:
   - Reload latest content.
   - Ask the user to re-apply their edit.
6. Keep fixture backend semantics aligned so tests exercise the same behavior locally.

### Practical note

This requires schema/data migration for existing records. Backfill `revision = 1` for existing items or treat missing revision as revision `1` in the condition logic.

### Verification

- Unit tests for stale-write rejection in fixture and DynamoDB adapters.
- Integration tests against DynamoDB Local.
- Admin UI tests for conflict response behavior where practical.

### Rollout

Use a staged deployment:

1. Backfill or tolerate missing revisions.
2. Deploy app/data code.
3. Remove fallback handling after production data is consistent.

---

## P1 — Validate persisted DynamoDB records at repository boundaries

### Current state

The DynamoDB repository maps stored items into domain types with conversion helpers in `multi-table-content-repository.ts`, but the mapping is mostly cast-based rather than runtime validation.

### Risk

Malformed or drifted persisted data can propagate into the public site, admin UI, prompts, and PDF rendering with unclear failure modes.

### Target state

Repository reads validate records against shared Zod schemas before returning them to callers, with actionable errors that identify the entity and key.

### Implementation

1. Extend each boundary mapper in `multi-table-content-repository.ts` to parse with the relevant schema from `packages/shared/src/schemas`.
2. Wrap validation errors with context:
   - Table/entity name.
   - Record `id` or singleton `section`.
   - Safe validation summary.
3. Fail closed for public content reads.
4. Decide whether admin reads should fail closed or surface repairable validation details:
   - Prefer fail closed initially.
   - Add repair tooling only if needed.
5. Add fixture/adapter parity tests so both backends expose the same domain guarantees.

### Verification

- Unit tests for malformed items in every repository mapper.
- Integration tests against DynamoDB Local.
- `pnpm test:integration`

### Rollout

Potentially production-blocking if existing records are malformed. Before deployment, run a read-only validation/seed audit against production data or a copied dataset.

---

## P2 — Split web and admin IAM permissions

### Current state

Both web and admin use `grantAppDataAccess()` in `packages/infra/src/naming.ts`, granting broad read/write DynamoDB and media-object access to every prefixed table.

### Risk

The public web Lambda has more write access than it needs. A vulnerability in the public app would have a larger blast radius than necessary.

### Target state

Each app receives only the permissions required for its workload.

### Implementation

1. Replace the shared helper with explicit grant profiles:
   - `grantWebDataAccess()`
   - `grantAdminDataAccess()`
2. Web should receive only the operations it actually needs:
   - Reads for content tables used by public pages/chat/PDF.
   - Rate-limit/cache table access where required.
   - Media read access only.
3. Admin should retain write access for CMS entities, media upload/delete, auth-adjacent operational needs, and generation history.
4. Prefer table-level scoping where practical, while preserving the prefix-based migration strategy from ADR 0001.
5. Keep wildcard prefix grants only where the migration benefit outweighs least privilege.

### Verification

- `pnpm --filter @portfolio/infra synth`
- Review synthesized IAM policies for web/admin differences.
- Exercise local/integration behavior to catch missing runtime permissions.
- Deploy to a non-production environment first if available.

### Rollout

Infra-only change, but it can break runtime behavior if permissions are too narrow. Deploy during a low-risk window and monitor the shared `AppErrors` alarm and PostHog exceptions.

---

## P2 — Correct documentation and comment drift

### Current state

Several documents/comments no longer match implementation:

- `README.md` describes 1-hour ISR and `revalidate = 3600`.
- Current public content pages and cached loaders use 10-second revalidation in several places.
- `apps/web/src/lib/data.ts` still says page-level ISR is `3600`.
- `packages/ai/src/context/build-candidate-facts.ts` references Supabase rows.
- `packages/shared/src/constants.ts` references Supabase.
- `RateLimitOptions.windowSec` says “sliding window,” while the DynamoDB adapter uses fixed-window counters.

### Risk

Documentation drift misleads future changes and weakens operational understanding, especially around caching, authorization, and persistence behavior.

### Target state

Docs describe actual behavior, and comments use current persistence terminology.

### Implementation

1. Decide the intended ISR policy:
   - Keep 10-second behavior and update docs/comments; or
   - Restore 3600-second behavior intentionally.
2. If keeping 10 seconds:
   - Update `README.md`.
   - Update `apps/web/src/lib/data.ts` comments.
   - Search all route/page `revalidate` values and make behavior consistent or explicitly documented.
3. Replace Supabase references with DynamoDB/fixture terminology.
4. Update rate-limit wording from “sliding window” to “fixed window” unless the implementation is intentionally changed later.
5. Add a short docs checklist to future PRs that touch caching, data, auth, or infra behavior.

### Verification

- `pnpm lint`
- `pnpm typecheck`
- Manual docs review for consistent terminology.
- Repository search for `Supabase`, `3600`, and “sliding window”.

### Rollout

Safe to ship independently. The only decision needed is whether current 10-second ISR behavior is intentional.

---

## P3 — Reduce dependence on full-table scans as content grows

### Current state

Collection reads use fully paginated `ScanCommand` in `packages/data/src/adapters/multi-table-content-repository.ts`. This is acceptable for a small portfolio dataset and keeps the table model simple.

### Risk

As content volume grows, scans increase latency and read cost. This is not currently urgent, but it becomes more important if project/media/skill/testimonial counts grow substantially.

### Target state

Collection listing patterns remain simple at current scale, but the repository has an upgrade path that avoids broad scans if data grows.

### Implementation

1. Keep scans for now; do not prematurely redesign.
2. Add clear thresholds for revisiting:
   - Sustained table size beyond a few hundred items.
   - Noticeable latency in page generation/admin listing.
   - Increased DynamoDB read cost.
3. If needed, add sortable keys or GSIs:
   - `sort_order` or `created_at` for list views.
   - `is_featured` for featured projects if filtering becomes expensive.
4. Introduce bounded pagination in repository list APIs before unbounded growth becomes a problem.
5. Revisit IAM and table design together so query access patterns and least privilege stay aligned.

### Verification

- Benchmark with representative data volume.
- Integration tests against DynamoDB Local.
- Compare CloudWatch latency/read metrics before and after.

### Rollout

No immediate action required. Treat this as a monitored architectural evolution rather than a current defect.

---

## Recommended execution order

1. **Authorization boundary audit and tests**
   - Highest security value and no data migration.
2. **Atomic cost-cap reservations**
   - Protects spend and addresses a concrete race.
3. **Optimistic concurrency**
   - Improves admin reliability but requires migration coordination.
4. **Repository boundary validation**
   - Improves data integrity; run a production-data audit first.
5. **IAM split**
   - Reduces public-app blast radius after behavior is better tested.
6. **Documentation cleanup**
   - Can happen in parallel once intended ISR behavior is confirmed.
7. **Scan scalability**
   - Defer until metrics or content growth justify it.

## Definition of done

- All mutating admin boundaries are explicitly authorized and covered by tests.
- Cost-cap enforcement cannot be bypassed by ordinary concurrent requests.
- Stale admin writes return conflicts rather than silently overwriting.
- Repository reads fail fast on malformed persisted records.
- Web and admin IAM policies are scoped to their actual responsibilities.
- Documentation matches runtime behavior.
- Scalability thresholds and follow-up criteria are recorded.

## Suggested verification commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm --filter @portfolio/infra synth
```

## Deployment checklist

- Run unit and integration tests locally.
- Validate any production data migration or backfill.
- Synth and review CDK IAM changes.
- Deploy lower-risk app changes before IAM tightening.
- Monitor CloudWatch `AppErrors`, Lambda logs, and PostHog after deploy.
- Confirm admin CMS, media uploads, public pages, chat, contact, and resume generation after release.
