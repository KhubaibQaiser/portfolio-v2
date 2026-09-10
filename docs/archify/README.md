# Architecture diagrams

Interactive [Archify](https://github.com/tt-a1i/archify) maps of this repository. Open any `.html` file in a browser (pan, zoom, search, light/dark, export). The README embeds the 1440×900 PNG stills.

| Diagram                                             | Type         | Source                                                                 | Interactive                         | What it shows                                     |
| --------------------------------------------------- | ------------ | ---------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------- |
| [Runtime architecture](./runtime-architecture.html) | architecture | [`runtime-architecture.json`](./runtime-architecture.json)             | [open](./runtime-architecture.html) | CloudFront, the three apps, DynamoDB, S3, Cognito |
| [Monorepo modules](./monorepo-modules.html)         | architecture | [`monorepo-modules.json`](./monorepo-modules.json)                     | [open](./monorepo-modules.html)     | Apps depend on `packages/shared` ports            |
| [CI to production](./ci-delivery.html)              | workflow     | [`ci-delivery.workflow.json`](./ci-delivery.workflow.json)             | [open](./ci-delivery.html)          | PR gates → Lighthouse → OIDC `cdk deploy`         |
| [Resume generation](./resume-generation.html)       | sequence     | [`resume-generation.sequence.json`](./resume-generation.sequence.json) | [open](./resume-generation.html)    | Admin enqueue → worker → policy → store           |
| [Job ingest](./job-ingest.html)                     | dataflow     | [`job-ingest.dataflow.json`](./job-ingest.dataflow.json)               | [open](./job-ingest.html)           | Free feeds → matcher → HITL / 85+ mail            |
| [Job HITL lifecycle](./job-hitl.html)               | lifecycle    | [`job-hitl.lifecycle.json`](./job-hitl.lifecycle.json)                 | [open](./job-hitl.html)             | `new` → `reviewing` → `applied` → `closed`        |

Runtime debug maps (files to open, CloudWatch `service` names) stay in [docs/flows/](../flows/README.md). Hosting and cache headers stay in [docs/architecture.md](../architecture.md). Decisions stay in [docs/adr/](../adr/).

## Regenerate

The Archify skill is vendored at [`.agents/skills/archify`](../../.agents/skills/archify) and symlinked into [`.cursor/skills/archify`](../../.cursor/skills/archify).

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" doctor
node "$ARCHIFY" validate architecture docs/archify/runtime-architecture.json --quality showcase
node "$ARCHIFY" deliver architecture docs/archify/runtime-architecture.json \
  docs/archify/runtime-architecture.html --quality showcase
node "$ARCHIFY" visual-check docs/archify/runtime-architecture.html
```

Repeat `validate` → `deliver` → `visual-check` for `monorepo-modules` (architecture), `ci-delivery` (workflow), `resume-generation` (sequence), `job-ingest` (dataflow), and `job-hitl` (lifecycle). Copy the 1440×900 light/dark PNGs to `*.light.png` / `*.dark.png` after a passing visual-check.

Showcase validation must report all nine artifact checks with zero composition errors before `deliver`. Do not edit a candidate after it has been delivered; change the JSON, then deliver again.
