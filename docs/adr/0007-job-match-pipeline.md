# ADR 0007 — Job match pipeline: free feeds first, own the matcher

- **Status:** Accepted. Implementation follows [`specs/job-match.md`](../../specs/job-match.md).
  Runtime maps (ingest / notify / tracker): [`docs/flows/job-ingest.md`](../flows/job-ingest.md).
- **Date:** 2026-08-29 (amended same day: v1 is free sources, not a paid
  catalog)
- **Deciders:** Khubaib (with AI pairing)
- **Depends on:** [ADR 0001](0001-cross-stack-references.md) (ARN/SSM, no
  CFN exports), [ADR 0002](0002-cost-optimization.md) (symptom alarms, no
  NAT), [ADR 0003](0003-candidate-mcp-server.md) / [ADR 0006](0006-candidate-mcp-oauth.md)
  (MCP stays read-only)

## Context

The product goal is: **see public roles that match the CMS portfolio plus
configurable preferences, and be told in time to apply early** — as soon
as a contracted feed has them, and **no later than 24 hours** after that.
Review, tailor, apply, and follow up stay human-in-the-loop (HITL).
Auto-apply is out.

Without working **discovery + freshness**, the dashboard, one-click
resume, and follow-up tracker are a well-typed empty inbox. This ADR locks
that bottleneck first. The rest of the pipeline is specified so later work
does not invent a second architecture.

Constraints carried from pairing:

- Personal LinkedIn must stay safe: **no `li_at` / session / cookie scrape**,
  no Apify LinkedIn actor on the personal account.
- Preference-first, not a company watchlist. Matching jobs, not “these 40
  employers.”
- `apps/candidate-mcp` stays read-only. A write-capable MCP tool still
  needs its own ADR.
- Same AWS account and CDK app. Account Lambda
  `ConcurrentExecutions` quota is 10 — ingest must be sequential, not a
  fleet of crawlers. Do not set `reservedConcurrentExecutions` (ADR 0003:
  AWS keeps a floor of 10 unreserved, so reserving even 1 fails create).
- No NAT Gateway (ADR 0002). No per-table CloudWatch alarms. No secrets
  in source. No caller-supplied URL fetch (SSRF).
- AWS stay ~$5/mo. **Paid job-index subscriptions are not worth it for a
  single HITL user.** v1 uses only free sources. Paid catalogs stay an
  explicit upgrade if recall on free feeds is the bottleneck.

## The actual problem

Greenhouse, Lever, and Ashby expose per-tenant JSON boards. Those GETs
work. Remotive, RemoteOK, Arbeitnow, The Muse, and We Work Remotely RSS
also work. That is not the hard part.

The hard part is **catalog discovery**:

1. Which of the ~200k public career sites posted a matching role _today_?
2. On which ATS (Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters,
   Personio, …) does that company live, and what is its slug/tenant?
3. Can we hear about it in hours, not the 18–72h LinkedIn syndication lag?
4. Can we do that without maintaining 50k scrapers that break every markup
   change, and without violating LinkedIn’s ToS on a personal account?

A paid index (JobsPipe Builder, Fantastic.jobs, TheirStack) is how teams
buy (1)–(3). For one user that spend is not justified. v1 therefore
**ingests every free public feed we can call legally**, plus **JobsPipe
Free** (1,000 jobs/month, no webhooks), and is honest that this is not
the Greenhouse/Workday universe.

## What “all matching jobs” means in v1

**In scope (the SLO applies here):** public postings that (a) appear on a
**v1 contracted source** (the free remote boards listed below, and
JobsPipe Free when credits remain), (b) pass preference filters (title
family, seniority, remote/hybrid, salary floor, visa / relocation,
employment type), and (c) score at or above the notify threshold against
the CMS portfolio.

**Out of scope (do not pretend otherwise):**

- Private / internal / referral-only roles.
- Jobs that exist only as a conversation with a recruiter.
- Most Greenhouse / Lever / Ashby / Workday tenants that never syndicate
  to Remotive, RemoteOK, WWR, Arbeitnow, The Muse, or the thin JobsPipe
  Free slice. This is the coverage we gave up by not paying.
- LinkedIn Easy Apply posts with no upstream ATS. Never scraped from a
  personal account.
- Authenticated Workday/iCIMS tenant portals.
- “Every job on earth.”

The v1 claim is: **P95 notify ≤ 24h of our first-seen on a contracted
free source, P50 well under that given a 4h poll.** It is an apply-early
edge versus checking those boards by hand. It is **not** ≥90% of staff-eng
roles on LinkedIn or company career pages.

## Why LinkedIn is still a trap

- LinkedIn retired the public Jobs API (2018). Remaining surfaces are
  Talent Solutions / partner APIs, not a self-serve key.
- Guest HTML from a cloud IP may return 200; `robots.txt` disallows
  `/jobs-guest/`. ToS scrape of LinkedIn from a personal account is how
  people lose the account they are hunting with.
- Official Job Alerts default to **daily email**. Indexing itself often
  lags the company career page by **18–48 hours**. “Just posted” on
  LinkedIn means “just indexed,” not “just opened on Greenhouse.”

Decision: **never scrape LinkedIn with the personal session.** Optional
later: human-configured LinkedIn Job Alert emails as a _secondary_ catch
net (parse inbound mail), not as the primary index. A paid ATS index is
the upgrade if LinkedIn-shaped coverage becomes the goal — never our own
crawler.

## Options considered

### A. DIY slug crawler (Greenhouse / Lever / Ashby / …)

**Rejected as primary.** We already proved the JSON endpoints work. We
cannot enumerate the tenants. Building a company graph is the vendor’s
whole business. Hydrate from an allowlisted apply-URL host when a free
feed already gave us that URL.

### B. Free aggregators (Remotive, WWR RSS, RemoteOK, Arbeitnow, The Muse)

**Accepted as v1 primary (unmetered).** Public JSON/RSS, no vendor card.
Skewed to remote listings; they miss most enterprise ATS boards. That is
the accepted tradeoff.

### C. Google-for-Jobs proxies (JSearch ~$25–150/mo, SerpAPI $25–150/mo)

**Rejected for v1** (paid). Upgrade if free-source recall is the problem
and we still will not scrape LinkedIn.

### D. JobsPipe

Developer jobs API over 42 named ATS/board sources. Normalized schema,
cross-source dedup, parsed salary.

| Plan    | Price | Credits/mo | Freshness    | Webhooks                           |
| ------- | ----- | ---------- | ------------ | ---------------------------------- |
| Free    | $0    | 1,000      | ≤24h         | no (email Signals only, cap 3)     |
| Builder | $49   | 25,000     | sub-6h crawl | yes; **deliveries cost 0 credits** |
| Scale   | $349  | 300,000    | sub-1h + SLA | yes                                |

**v1 uses the Free plan only.** 1,000 credits/month, ≤24h crawl, three
email-only Signals. No webhooks (paid feature). Evaluating a Signal does
not consume credits, but Free cannot push HMAC events into our worker —
Signals are a human inbox backup, not ingest.

JobsPipe search **does** consume 1 credit per job returned. Unfiltered or
4-hourly polling will exhaust Free in days. v1 may call search **at most
once per calendar day**, with tight preference filters and
`posted_at_gte` of the last 48h, and must stop on HTTP 429 / remaining
credits. First-party boards carry volume; JobsPipe Free is a thin ATS
complement.

Sandbox `POST https://api.jobspipe.dev/v1/sandbox/jobs/search` returns the
live schema with no key (probed 2026-08-29). Live search needs a Free key
in Secrets Manager.

Builder/Scale remain the documented upgrade when one user decides
coverage is worth ~$49+/mo. They are **not** v1.

### E. Fantastic.jobs (~$95/mo floor) / F. TheirStack / G. Dual paid index

**Rejected for v1.** Same upgrade shelf as JobsPipe Builder.

## Decision

**1. v1 discovery is free sources, not a paid catalog.**

Contracted v1 sources (allowlisted hosts only):

| Source                         | Access                       | Role in v1                                     |
| ------------------------------ | ---------------------------- | ---------------------------------------------- |
| Remotive                       | public JSON API              | Primary remote board                           |
| RemoteOK                       | public JSON API              | Primary remote board                           |
| Arbeitnow                      | public JSON API              | Primary remote board                           |
| The Muse                       | public JSON API              | Primary remote board                           |
| We Work Remotely               | RSS (JSON is Cloudflare 403) | Primary remote board                           |
| JobsPipe **Free**              | Bearer key, 1,000 jobs/mo    | Thin ATS complement; **daily** search max      |
| JobsPipe Signals (Free, email) | 3 saved searches, email only | Human backup; **not** parsed into Dynamo in v1 |
| Greenhouse / Lever / Ashby     | per-tenant JSON              | Hydrate JD from our stored `apply_url` host    |

No Fantastic.jobs, JSearch, SerpAPI, TheirStack, or JobsPipe Builder in
v1. Switching later is an adapter behind `JobBoardRepository`, not a
rewrite.

**2. Ingest is poll-first (no vendor webhooks in v1).**

```
EventBridge every 4h
        │
        ▼
Admin sequential ARM Lambda (no reserved concurrency; quota-10 floor)
        │
        ├─ GET Remotive / RemoteOK / Arbeitnow / Muse / WWR RSS
        ├─ (once per UTC day) JobsPipe /v1/jobs/search — tight filters,
        │    posted_at_gte last 48h, stop on 429 or credit floor
        ▼
normalize + idempotent upsert
        │
        ▼
allowlisted ATS hydrate (GH/Lever/Ashby JSON from our apply_url)
        │
        ▼
preference filter → hybrid matcher → persist
        │
        ├─ score ≥ 85 and notified_at null → immediate Resend
        └─ score ≥ 70 → morning digest
```

- Same AWS account, **Admin stack owns** the job table and worker. MCP
  is not in this path.
- **No `reservedConcurrentExecutions`.** Same constraint as
  [ADR 0003](0003-candidate-mcp-server.md): this account's quota is 10,
  and AWS will not let unreserved drop below 10. Reserving 1 on ingest
  (or notify) fails deploy with
  `UnreservedConcurrentExecution below its minimum value of [10]`.
  Serialization is EventBridge `rate(4 hours)` plus a 300s timeout (a
  tick cannot overlap the next) and a single Lambda walking the
  allowlist — not a crawler fleet. Revisit a reserved cap after a quota
  increase. Optional SQS if a source adapter should retry independently;
  not required for v1.
- Idempotency key: source + source job id, plus a secondary natural key
  `sha256(company_domain + '|' + normalized_title + '|' + location)`.
- Hydrate full JD only from an **allowlist of ATS hosts** derived from
  our stored `apply_url`, never from a caller-supplied URL.
- Untrusted JD text goes through existing `stripPromptInjection` +
  `wrapUntrusted` before any model sees it.
- JobsPipe Free API key lives in Secrets Manager (ARN via SSM registry,
  ADR 0001). Never log the key. No HMAC webhook secret in v1.

**3. Notification SLO (the contract we will page on).**

| Metric                     | Target                                                     |
| -------------------------- | ---------------------------------------------------------- |
| Poll cadence               | every 4 hours                                              |
| P50 `notify_at - our_seen` | ≤ 4 hours (one poll interval)                              |
| P95 `notify_at - our_seen` | ≤ 24 hours                                                 |
| Immediate email            | new rows with matcher score ≥ 85                           |
| Daily digest               | new rows with score ≥ 70, 07:00 Europe/London              |
| Dedup                      | one email per canonical job id                             |
| Source failure             | log `ERROR` (ADR 0002 `AppErrors`); continue other sources |

`our_seen` is when **our worker first persisted the row**, which cannot
be earlier than the free feed’s own lag. We will **not** claim “within
24h of a Greenhouse publish” or “seconds after LinkedIn.” We **will**
claim “within 24h of a contracted free source having the posting, usually
the next 4h poll, with an immediate ping for 85+.”

**4. Matching stays ours.**

Feeds do not know the CMS portfolio. Hybrid white-box matcher
(preference hard filters + skill Jaccard/synonyms + lexical JD overlap)
runs on ingest. LLM ATS scoring runs only after HITL “tailor,” through
the existing `enforceResumeGenerationPolicy` / `validateFabrication`
path. One Recommended pointer per ingest window (singleton, not a TTL
tag).

**5. HITL surfaces stay in admin.**

TanStack virtual infinite table, detail with gaps, one-click enqueue of
existing generation/PDF workers, status machine, 7-day snoozable
follow-up. All mutations `requireAdmin()`. New table suffix under
`TABLE_SUFFIXES`; `grantCandidateMcpDataAccess` is **not** widened.

**6. Budget (v1).**

| Line                    | Monthly (USD) | Notes                                       |
| ----------------------- | ------------- | ------------------------------------------- |
| Remote-board APIs / RSS | 0             | Remotive, RemoteOK, Arbeitnow, Muse, WWR    |
| JobsPipe Free           | 0             | 1,000 credits; 3 email Signals; no webhooks |
| AWS (existing + ingest) | ~5            | Lambda/Dynamo; no NAT; ADR 0002             |
| Resend                  | 0             | Existing domain + contact-form key          |
| **v1 total vendor**     | **0**         |                                             |
| **v1 total (with AWS)** | **~$5**       |                                             |

Upgrade shelf (not v1): JobsPipe Builder $49 (webhooks, 25k credits),
Fantastic.jobs $95, JSearch $25. Paid spend needs an ADR amendment, not
a silent CDK secret.

ADR 0002’s AWS `monthlyBudgetUsd` alarm stays the runaway backstop.

## Invariants (do not weaken)

1. No LinkedIn cookie, session, or personal-account scrape. No Apify
   LinkedIn actor in v1.
2. No company watchlist as the discovery mechanism.
3. No auto-apply.
4. MCP tools stay read-only; job table IAM is not granted to
   `grantCandidateMcpDataAccess`.
5. Ingest concurrency stays 1. No NAT. No per-table alarms. Secrets in
   Secrets Manager.
6. JD hydrate and any outbound HTTP use a host allowlist, never a
   caller-supplied URL.
7. Unvalidated model JSON never reaches the jobs UI (same Resume AI
   policy as `specs/resume-ai.md` when tailoring).
8. Do not claim coverage we do not contract. v1 is free feeds, not the
   ATS universe.
9. Do not add a paid job-index subscription without amending this ADR.
   Do not poll JobsPipe in a way that exhausts the Free 1,000 credits
   (max one search call-set per UTC day; stop on 429).

## Out of scope for v1

- n8n / MacBook as system of record.
- Apify for JS-only career pages (optional later, still not LinkedIn).
- Write-capable MCP tools (“apply”, “save job”).
- Workday authenticated tenants.
- JobsPipe Builder/Scale, Fantastic.jobs, TheirStack, JSearch, SerpAPI.
- Parsing JobsPipe Signal emails into Dynamo (human backup only).
- HMAC vendor webhooks (paid JobsPipe feature).

## Consequences

- Vendor job-index cost is **$0**. AWS stays on the ADR 0002 budget.
- Recall is **remote-board-shaped**. Most staff roles that only live on
  a company Greenhouse/Workday page will not appear until they hit a
  free aggregator or the thin JobsPipe Free daily slice.
- The 24h SLO is vs **our poll of free sources**, not vs ATS publish
  time.
- Engineering time still goes into the matcher, idempotent ingest,
  notify correctness, and HITL — adapters behind a port so a paid index
  can be added later without a rewrite.
- A 14-day paid-vendor bakeoff is **not** a v1 gate. Revisit it only if
  we amend this ADR to spend.

## References (vendor / feed claims as of 2026-08-29)

- JobsPipe pricing and Signals: https://jobspipe.dev/pricing.md,
  https://jobspipe.dev/signals.md
- JobsPipe LinkedIn-upstream (upgrade context):
  https://jobspipe.dev/sources/linkedin.md
- Free boards probed from this environment: Remotive, RemoteOK,
  Arbeitnow, The Muse (HTTP 200 JSON); WWR RSS 200 / WWR JSON Cloudflare 403.
