# Job match pipeline — acceptance spec

This is the contract for **finding matching public jobs on free sources
and notifying in time to apply early**. Prompt copy, UI chrome, and
source adapters may change; the merge gate is the discovery SLO and the
HITL invariants below.

Architecture decision: [`docs/adr/0007-job-match-pipeline.md`](../docs/adr/0007-job-match-pipeline.md).
Runtime map when ingest is broken: [`docs/flows/job-ingest.md`](../docs/flows/job-ingest.md).
Do not implement ingest, tables, or `/jobs` UI until that ADR is Accepted
and an execute go is recorded. This spec is the acceptance bar for that
work.

## Goal

Khubaib spends minutes per day reviewing, tailoring, applying, and
following up — not hunting the contracted boards by hand. The system must
surface **preference-matching public roles from v1 free sources** and
notify **as soon as we have them, with P95 ≤ 24 hours of our first persist**.

The dashboard, one-click artifacts, and tracker still depend on this
working. v1 does **not** claim the Greenhouse/Workday universe.

## Honest coverage

**Must claim:** public postings on contracted **free** sources that pass
preferences and the matcher.

**Must not claim:** every job on earth; private/referral roles;
authenticated ATS portals; most company career-page roles that never hit
Remotive / RemoteOK / Arbeitnow / The Muse / WWR / the JobsPipe Free
daily slice; LinkedIn Easy Apply with no upstream ATS.

## Discovery (critical path)

### Primary sources (v1)

Port `JobBoardRepository` (to be added under `packages/shared/src/ports`)
with one adapter per allowlisted source:

| Source            | How                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Remotive          | public JSON API                                                                                                       |
| RemoteOK          | public JSON API                                                                                                       |
| Arbeitnow         | public JSON API                                                                                                       |
| The Muse          | public JSON API                                                                                                       |
| We Work Remotely  | RSS only (JSON is Cloudflare 403)                                                                                     |
| JobsPipe **Free** | `POST /v1/jobs/search`, max once per UTC day, tight filters + `posted_at_gte` last 48h, 1,000 credits/mo, stop on 429 |

### Complements

- First-party hydrate from allowlisted ATS JSON when `apply_url` host is
  Greenhouse, Lever, or Ashby — full JD when the free feed gave us a URL.
- JobsPipe Free email Signals (cap 3): human backup inbox. **Not** parsed
  into Dynamo in v1.

### Forbidden

- LinkedIn cookie / session / `li_at` scrape; Apify LinkedIn on the
  personal account; `jobs-guest` HTML despite HTTP 200.
- Caller-supplied URL fetch (SSRF). Hydrate only allowlisted hosts from
  _our_ stored apply URL.
- Company watchlist as the discovery mechanism.
- Paid job-index subscriptions (JobsPipe Builder/Scale, Fantastic.jobs,
  JSearch, SerpAPI, TheirStack) unless ADR 0007 is amended.
- Polling JobsPipe more than once per UTC day, or without
  `posted_at_gte` / title filters (will exhaust Free credits).
- HMAC vendor webhooks (paid JobsPipe feature).

### Ingest path

1. EventBridge every 4 hours → sequential ARM Lambda. Do not set
   `reservedConcurrentExecutions` (account quota 10; AWS unreserved
   floor is 10 — see ADR 0003 / 0007). Overlap is prevented by the 4h
   schedule plus a 300s timeout.
2. Walk the allowlisted adapters. JobsPipe Free only if this is the
   day’s single allotted search and credits remain.
3. Idempotent upsert on `source + source_id` and natural key
   `sha256(company_domain|normalized_title|location)`.
4. Preference hard-filter, then hybrid matcher, then persist.
5. Failures log `ERROR` (ADR 0002 `AppErrors`) and continue other
   sources. No per-table alarms.

### Notification SLO

| Signal         | When                                          | Channel                    |
| -------------- | --------------------------------------------- | -------------------------- |
| Immediate      | New canonical job, score ≥ 85, not yet mailed | Resend (existing domain)   |
| Morning digest | New score ≥ 70 since last digest              | Resend 07:00 Europe/London |
| Source failure | Adapter throws after retries                  | `AppErrors`                |

SLOs:

- Poll every 4 hours.
- P50 `(notified_at - our_first_seen) ≤ 4h`
- P95 `(notified_at - our_first_seen) ≤ 24h`
- At-most-once email per canonical id (`notified_at` set in the same
  conditional write as the send, or transactional outbox).

Lag against “hiring manager clicked Publish on Greenhouse” is **not**
the SLO. Lag against **our persist from a free feed** is.

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
The same preference object is the filter payload for the daily JobsPipe
Free search so credits are not spent on off-preference rows.

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
- Attributes: source ids, source, company, title, location, remote,
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

- Meet the notify SLO on contracted **free** sources.
- Dedup across sources onto one canonical row.
- Keep ingest concurrency at 1.
- Cap JobsPipe Free at one search per UTC day; stop on 429.
- Use Secrets Manager for the JobsPipe Free key (still a secret).
- Pass JD through `stripPromptInjection` then `wrapUntrusted`.

## Must not

- Scrape LinkedIn with the personal account.
- Auto-apply.
- Surface unvalidated model JSON.
- Widen candidate-mcp IAM.
- Relax Lighthouse to pay for this feature.
- Wire a paid job-index plan without amending ADR 0007.
- Parse vendor alert email as ingest in v1.

## Verification

Until code exists, verification is this spec plus ADR 0007 review.

When code exists:

- Unit: adapters against recorded fixtures (no live vendor in CI),
  idempotent upsert, matcher evals, status machine, `requireAdmin`
  guardrail, JobsPipe daily-cap logic.
- Worker: fixture payloads; no live LLM in CI. Live JobsPipe/Remotive
  calls are not unit tests.
- CDK: ingest/notify Lambdas have no `reservedConcurrentExecutions`
  (account unreserved floor); job table not in
  `grantCandidateMcpDataAccess`; JobsPipe secret ARN via SSM, not CFN
  exports.
- Manual: 4h poll inserts a new Remotive row + 85+ email; duplicate
  payload does not double-mail; a second JobsPipe search the same UTC
  day is skipped.
