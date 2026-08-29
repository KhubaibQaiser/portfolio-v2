# Job match pipeline — acceptance spec

This is the contract for **finding matching public jobs and notifying in
time to apply early**. Prompt copy, UI chrome, and vendor adapters may
change; the merge gate is the discovery SLO, the bakeoff, and the HITL
invariants below.

Architecture decision: [`docs/adr/0007-job-match-pipeline.md`](../docs/adr/0007-job-match-pipeline.md).
Do not implement ingest, tables, or `/jobs` UI until that ADR is Accepted
and an execute go is recorded. This spec is the acceptance bar for that
work.

## Goal

Khubaib spends minutes per day reviewing, tailoring, applying, and
following up — not hunting. The system must surface **preference-matching
public roles** and notify **as soon as we have them, with P95 ≤ 24 hours
of the vendor’s first-seen timestamp**.

The dashboard, one-click artifacts, and tracker are worthless if this
goal fails.

## Honest coverage

**Must claim:** public postings on contracted sources that pass
preferences and the matcher.

**Must not claim:** every job on earth; private/referral roles;
authenticated ATS portals; LinkedIn Easy Apply posts with no upstream ATS
unless a bakeoff-winning vendor indexes them.

## Discovery (critical path)

### Primary index

A commercial job catalog behind port `JobBoardRepository` (to be added
under `packages/shared/src/ports`). Default candidate: **JobsPipe Builder
($49/mo)** using saved **Signals** + HMAC `alert.matched` / `job.created`
webhooks (deliveries do not consume credits). Swap-able to Fantastic.jobs
hourly pull or a dual index if the bakeoff says so.

### Complements (never the only source)

- First-party hydrate from allowlisted ATS JSON when `apply_url` host is
  Greenhouse, Lever, or Ashby — full JD beats SERP snippets.
- Free remote boards (Remotive, RemoteOK, Arbeitnow, The Muse, WWR RSS)
  as a cheap extra net, same normalize/dedup path.
- Google-for-Jobs (JSearch) only if single-vendor gold-set recall < 90%.

### Forbidden

- LinkedIn cookie / session / `li_at` scrape; Apify LinkedIn on the
  personal account; `jobs-guest` HTML despite HTTP 200.
- Caller-supplied URL fetch (SSRF). Hydrate only allowlisted hosts from
  *our* stored apply URL.
- Company watchlist as the discovery mechanism.
- Polling an unfiltered worldwide index on a credit-metered plan.

### Ingest path

1. Vendor webhook → signature verify → SQS.
2. EventBridge every 4 hours: `posted_at_gte` watchdog for the same
   preference query (catches webhook silence; must not be the primary
   JobsPipe credit path).
3. Worker `reservedConcurrency = 1` (account Lambda quota is 10).
4. Idempotent upsert on vendor id + natural key
   `sha256(company_domain|normalized_title|location)`.
5. Preference hard-filter, then hybrid matcher, then persist.
6. Failures log `ERROR` (ADR 0002 `AppErrors`). No per-table alarms.

### Notification SLO

| Signal            | When                                      | Channel                  |
| ----------------- | ----------------------------------------- | ------------------------ |
| Immediate         | New canonical job, score ≥ 85, not yet mailed | Resend (existing domain) |
| Morning digest    | New score ≥ 70 since last digest          | Resend 07:00 Europe/London |
| Silence           | No webhook *and* watchdog miss            | `AppErrors`              |

SLOs:

- P50 `(notified_at - vendor_first_seen) ≤ 6h`
- P95 `(notified_at - vendor_first_seen) ≤ 24h`
- At-most-once email per canonical id (`notified_at` set in the same
  conditional write as the send, or transactional outbox).

Lag against “hiring manager clicked Publish” is **not** the SLO. Lag
against vendor first-seen **is**. Vendor lag vs ATS post time is a
bakeoff metric, not something we can code around.

## Bakeoff (implementation step 0)

Run 14 days before a paid key is wired into CDK.

**Gold set:** 20 roles Khubaib would apply to, logged manually from ATS
pages and LinkedIn (human browser, not a scraper). Columns:

| Field                 | Meaning                                      |
| --------------------- | -------------------------------------------- |
| `ats_url`             | Canonical apply URL on the company board     |
| `ats_first_seen`      | When it appeared on that board (human note)  |
| `linkedin_url`        | If listed; else empty                        |
| `linkedin_first_seen` | When it appeared on LinkedIn; else empty     |
| `jobspipe_first_seen` | Vendor timestamp or “miss”                   |
| `fantastic_first_seen`| Vendor timestamp or “miss”                   |
| `jsearch_first_seen`  | Vendor timestamp or “miss”                   |
| `jd_complete`         | full / snippet / missing                     |
| `linkedin_only`       | true if no public ATS URL                    |

**Pass (single vendor wins):**

- `gold_set_recall` ≥ 0.90 excluding `linkedin_only`.
- P95 `(vendor_first_seen - ats_first_seen) ≤ 24h` on hits.
- P50 of that lag ≤ 6h.
- ≥ 80% of hits have full JD after hydrate (or natively).
- Duplicate rate after natural key < 5%.

**LinkedIn-only gap:** if `linkedin_only` rows are > 20% of the gold set
and the ATS vendor misses them, add JSearch or Fantastic `active-jb` —
still no personal-account scrape.

**Credit sanity:** projected monthly credits for the chosen access pattern
(Signals vs hourly poll) must fit the plan with ≥ 2× headroom.

Record the filled table in the execute PR, then put the winning key in
Secrets Manager.

## Preferences (system of record)

Stored in admin (CMS singleton), not in MCP and not in a watchlist of
companies. Fields (Zod, `.strict()`, to be added under `packages/shared`):

- Title families / seniority bands (e.g. staff, senior staff, principal).
- Work arrangement: remote / hybrid / onsite; location allow/deny.
- Salary floor + currency.
- Employment type (full-time, contract, …).
- Visa / relocation: required / optional / exclude.
- Keyword include / exclude (skills, domains).
- Notify threshold (default 85) and digest threshold (default 70).

Hard filters drop the row before scoring. Soft signals feed the matcher.

## Matcher

White-box, offline-eval’d, no live LLM on ingest:

- Preference filters (hard).
- Skill overlap vs CMS skills with a small synonym list.
- Lexical overlap of title + JD vs fact sheet.

Output: integer 0–100, band label (e.g. low / medium / high / excellent),
gap list for the detail pane. One Recommended singleton pointer per ingest
window (clear previous; do not TTL-tag rows).

Add eval cases under `packages/ai/src/evals/cases/` (or a sibling job-match
eval folder) **before** changing matcher weights. Fixtures that should
fail the threshold are marked `expect: "fail"`. Do not invent employers
or metrics in fixtures.

LLM ATS scoring is **only** on HITL tailor, through
`enforceResumeGenerationPolicy` and `validateFabrication`.

## Persistence

New Dynamo table suffix (not yet created). Proposed keys:

- PK `id` (canonical).
- GSI `by-status-posted` (`status` + `posted_at`) for the table UI.
- GSI `by-score` for Recommended / high-match queries if a query
  pattern needs it; do not add indexes speculatively.
- Attributes: vendor ids, source, company, title, location, remote,
  salary, apply_url, jd_text, score, band, status, `notified_at`,
  `follow_up_at`, timestamps.

`grantCandidateMcpDataAccess` must **not** include this table. Admin
uses the existing app wildcard grant.

## Admin HITL (after discovery works)

- `/jobs` TanStack virtual infinite table: filters, bands, Recommended.
- Detail: JD, score breakdown, gaps, discard, tailor.
- One-click enqueue of existing generation + PDF workers: tailored
  resume, cover letter PDF+text, recruiter message. Same Resume AI
  policy. Unvalidated JSON never reaches the UI.
- Status machine: new → reviewing → applied / discarded / snoozed /
  closed. Applied sets `follow_up_at = now+7d` (snoozable).
- Daily Lambda: Resend reminder for due follow-ups.
- Every mutation calls `requireAdmin()`. Guardrail test updated.

## MCP

No new tools in v1. Profile tools stay read-only. A future “list matches”
tool is a new ADR plus `deepSanitize`.

## Must

- Meet the notify SLO on contracted sources after the bakeoff vendor is
  wired.
- Dedup across sources onto one canonical row.
- HMAC-verify webhooks; reject unsigned or stale timestamps.
- Keep ingest concurrency at 1.
- Use Secrets Manager for vendor keys and webhook secrets.
- Pass JD through `stripPromptInjection` then `wrapUntrusted`.

## Must not

- Scrape LinkedIn with the personal account.
- Auto-apply.
- Surface unvalidated model JSON.
- Widen candidate-mcp IAM.
- Relax Lighthouse to pay for this feature.
- Poll credit-metered APIs in a way that exhausts the plan (prefer
  Signals/webhooks; if polling, match `time_frame` to cadence).

## Verification

Until code exists, verification is the bakeoff table plus this spec
review.

When code exists:

- Unit: signature verify, idempotent upsert, matcher evals, status
  machine, `requireAdmin` guardrail.
- Worker: SQS fixture messages; no live vendor or live LLM in CI.
- CDK: ingest Lambda reserved concurrency 1; job table not in
  `grantCandidateMcpDataAccess`; secret ARNs via SSM, not CFN exports.
- Manual: webhook from vendor staging → row + 85+ email; kill webhook →
  4h watchdog still inserts; duplicate vendor payload does not double-mail.
