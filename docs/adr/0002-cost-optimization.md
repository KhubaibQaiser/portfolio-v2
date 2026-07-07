# ADR 0002 — Cost optimization: symptom-based observability to hit a ~$5/mo budget

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Khubaib (with AI pairing)

## Context

Target AWS budget for this portfolio is **~$5/month**, while keeping useful
observability. A cost review of the deployed infra found the bill was dominated
not by traffic but by **fixed CloudWatch alarm charges**.

CloudWatch bills alarms **per referenced metric**, and a metric-math alarm is
charged for _every_ metric in its expression. The previous `SharedStack`
observability created, for all 9 DynamoDB tables:

| Alarm group                             | Count  | Metrics each | Alarm-metrics | $/mo      |
| --------------------------------------- | ------ | ------------ | ------------- | --------- |
| Throttle (per table)                    | 9      | 1            | 9             | $0.90     |
| SystemErrors (per table, 6-metric math) | 9      | 6            | 54            | $5.40     |
| **Total**                               | **18** |              | **63**        | **$6.30** |

That ~$6.30/mo **alone exceeded the entire budget**, before any traffic. Other
findings:

- **CloudWatch dashboards**: 3 custom dashboards are free (≤50 metrics each); the
  one dashboard here is **$0** (an earlier estimate of $3 was wrong).
- **Lambda log groups had no retention** → defaulted to _Never Expire_, so log
  **storage** accrues forever.
- `POWERTOOLS_LOG_LEVEL=INFO` logged a line per request (ingestion at $0.50/GB).
- **No VPC/NAT Gateway** (avoids ~$32/mo) and **no X-Ray** — both good.
- Variable services (CloudFront, Lambda, DynamoDB on-demand, S3) sit inside
  always-free tiers at portfolio traffic (~$0–2/mo).

## Decision

Replace per-resource infrastructure alarms with **one symptom-based application
alarm**, and add log-cost hygiene.

1. **Single `AppErrors` alarm.** Each app (web, admin) has a CloudWatch Logs
   **metric filter** on its server-function log group matching the Powertools
   `{ $.level = "ERROR" }` line, publishing to a shared, **dimensionless** metric
   `Portfolio/Observability / AppErrors`. Because neither filter sets dimensions,
   both apps roll up into one time series. The `SharedStack` puts **one**
   standard alarm on it → SNS. Cost: **~$0.10/mo** (1 alarm-metric).
   - Rationale: any DynamoDB/S3/AI/auth fault that actually matters surfaces as a
     logged `ERROR` in the app (per the error-handling rule). Alarming on the
     user-facing **symptom** is a superset of the dropped infra alarms, for ~2%
     of the cost.
   - This complements the rule's PostHog `captureException` path: app-side
     capture + AWS-side alarm, no silent failures.

2. **Drop the 18 per-table DynamoDB alarms.** On `PAY_PER_REQUEST` tables at this
   scale, throttling is effectively impossible and `SystemErrors` are rare
   AWS-side faults that also fail the app call (caught by `AppErrors`). The
   dashboard still visualizes DynamoDB throttles/errors/capacity via
   account-scoped `SEARCH` expressions (no per-table or per-alarm cost).

3. **Bounded log retention.** Every Lambda (OpenNext server/image/revalidation
   per app) gets an explicit `LogGroup` with
   **14-day** retention and `DESTROY` removal, so log storage stays ~$0.

4. **`POWERTOOLS_LOG_LEVEL=WARN` in production.** Captures WARN+ERROR, drops
   INFO, cutting ingestion. The `AppErrors` filter is unaffected (ERROR ≥ WARN).

## Decisions taken (explicit)

- **DynamoDB throttle aggregate alarm:** _dropped for now_; can reintroduce one
  aggregate alarm later if real throttling ever appears.
- **Route 53 hosted zone:** _kept_ (~$0.50/mo) — needed at launch.
- **Log level:** _WARN_ (WARN+ERROR) in prod.

## Consequences

- **Cost:** fixed observability drops from ~$6.30/mo to ~$0.10/mo. Expected total
  AWS bill **~$1.50–3/month** at portfolio traffic, comfortably under $5.
  The `monthlyBudgetUsd` alarm stays at $25 as a runaway backstop.
- **Positive:** alarms now reflect user-facing failures; logs can't grow
  unbounded; design stays decoupled (alarm references the metric by
  namespace/name, not a cross-stack construct — ADR 0001 preserved).
- **Trade-offs:**
  - No per-table infra granularity. Triage starts from `AppErrors` + the
    dashboard's SEARCH widgets rather than a table-specific alarm.
  - INFO flow logs are off in prod. To trace a live issue, temporarily set the
    Lambda env `POWERTOOLS_LOG_LEVEL=INFO` (env-only change, no code redeploy).
  - The shared `AppErrors` metric has no per-app dimension, so the alarm can't
    say _which_ app erred — the alarming log line (and `POWERTOOLS_SERVICE_NAME`)
    identifies it. A per-app dimension could be added later at +$0.10/mo.

## Not changed

- AWS Budget (free, 80%/100% → SNS), the single free dashboard, SNS/SES/
  EventBridge (idle/free), DynamoDB PITR (a few cents at sub-GB data).
- Always-free tiers (CloudFront 1 TB/10M req, Lambda 1M req/400k GB-s) keep
  variable cost ~$0; nothing here changes them.
