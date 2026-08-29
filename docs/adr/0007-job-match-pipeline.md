# ADR 0007 — Job match pipeline: buy the catalog, own the matcher

- **Status:** Proposed (docs only). Implementation is gated on (1) a 14-day
  vendor bakeoff recorded against the gold set in
  [`specs/job-match.md`](../../specs/job-match.md), and (2) an explicit
  execute go. No ingest Lambda, table, or `/jobs` UI ships in this change.
- **Date:** 2026-08-29
- **Deciders:** Khubaib (with AI pairing)
- **Depends on:** [ADR 0001](0001-cross-stack-references.md) (ARN/SSM, no
  CFN exports), [ADR 0002](0002-cost-optimization.md) (symptom alarms, no
  NAT), [ADR 0003](0003-candidate-mcp-server.md) / [ADR 0006](0006-candidate-mcp-oauth.md)
  (MCP stays read-only)

## Context

The product goal is not “a scraper.” It is: **see every public role that
matches the CMS portfolio plus configurable preferences, and be told in
time to apply early** — ideally as soon as the posting is on a public
board, and **no later than 24 hours** after that. Review, tailor, apply,
and follow up stay human-in-the-loop (HITL). Auto-apply is out.

Without production-grade **discovery + freshness**, the dashboard, one-click
resume, and follow-up tracker are a well-typed empty inbox. This ADR locks
that bottleneck first. The rest of the pipeline is specified so later work
does not invent a second architecture, but it is not the critical path.

Constraints carried from pairing:

- Personal LinkedIn must stay safe: **no `li_at` / session / cookie scrape**,
  no Apify LinkedIn actor on the personal account.
- Preference-first, not a company watchlist. “All matching jobs,” not
  “these 40 employers.”
- `apps/candidate-mcp` stays read-only. A write-capable MCP tool still
  needs its own ADR.
- Same AWS account and CDK app. Account Lambda
  `ConcurrentExecutions` quota is 10 — ingest must be sequential, not a
  fleet of crawlers.
- No NAT Gateway (ADR 0002). No per-table CloudWatch alarms. No secrets
  in source. No caller-supplied URL fetch (SSRF).
- AWS stay ~$5/mo. **Vendor job-index spend is a separate, accepted line
  item** if it is what buys coverage and the 24h SLO.

## The actual problem

Greenhouse, Lever, and Ashby expose per-tenant JSON boards. Those GETs
work. Remotive, RemoteOK, Arbeitnow, The Muse, and We Work Remotely RSS
also work. That is not the hard part.

The hard part is **catalog discovery**:

1. Which of the ~200k public career sites posted a matching role *today*?
2. On which ATS (Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters,
   Personio, …) does that company live, and what is its slug/tenant?
3. Can we hear about it in hours, not the 18–72h LinkedIn syndication lag?
4. Can we do that without maintaining 50k scrapers that break every markup
  change, and without violating LinkedIn’s ToS on a personal account?

A hobby project answers (1)–(3) with a hard-coded slug list and a daily
cron. It silently misses almost every matching role. A production system
**buys an already-maintained catalog** and spends engineering time on
normalization, matching, notification SLOs, and HITL — not on discovering
that Stripe’s Greenhouse board is `stripe`.

## What “all matching jobs” means

**In scope (the SLO applies here):** public postings that (a) appear on a
supported ATS career page or a covered job board, (b) pass preference
filters (title family, seniority, remote/hybrid, salary floor, visa /
relocation, employment type), and (c) score at or above the notify
threshold against the CMS portfolio.

**Out of scope (do not pretend otherwise):**

- Private / internal / referral-only roles.
- Jobs that exist only as a conversation with a recruiter.
- LinkedIn Easy Apply posts that were never published on an ATS we (or
  the vendor) index — a real but bounded gap; see bakeoff metric
  `linkedin_only_recall`.
- Authenticated Workday/iCIMS tenant portals.
- “Every job on earth.”

The production claim is: **≥90% recall of public, preference-matching
roles on the contracted sources, with P95 notify ≤ 24h of the vendor’s
first-seen timestamp, and P50 well under that.** That is an apply-early
edge versus people waiting on LinkedIn’s daily digest. It is not omniscience.

## Why LinkedIn is a trap for this SLO

- LinkedIn retired the public Jobs API (2018). Remaining surfaces are
  Talent Solutions / partner APIs, not a self-serve key.
- Guest HTML from a cloud IP may return 200; `robots.txt` disallows
  `/jobs-guest/`. ToS scrape of LinkedIn from a personal account is how
  people lose the account they are hunting with.
- Official Job Alerts default to **daily email**. Indexing itself often
  lags the company career page by **18–48 hours**. “Just posted” on
  LinkedIn means “just indexed,” not “just opened on Greenhouse.”
- Most tech roles appear on Greenhouse / Lever / Ashby / Workday **first**.
  LinkedIn syndicates later. **Apply-early is won on the ATS URL**, not
  on Easy Apply.

Decision: **never scrape LinkedIn with the personal session.** Optional
later: human-configured LinkedIn Job Alert emails as a *secondary* catch
net (parse inbound mail), not as the primary index. Primary coverage of
“jobs you would have seen on LinkedIn” is **upstream ATS** plus, if the
bakeoff shows a LinkedIn-only hole, a vendor that indexes public LinkedIn
postings (Fantastic.jobs `active-jb`, or Google-for-Jobs via JSearch) —
never our own crawler.

## Options considered

### A. DIY slug crawler (Greenhouse / Lever / Ashby / …)

**Rejected as primary.** We already proved the JSON endpoints work. We
cannot enumerate the tenants. Building a company graph is the vendor’s
whole business. DIY is the hobby failure mode.

### B. Free aggregators only (Remotive, WWR RSS, RemoteOK, Arbeitnow, The Muse)

**Rejected as primary.** Useful complement for remote-board coverage and
$0 JD text. They do not cover Workday enterprises, most Greenhouse
customers, or staff-level roles at companies that never post to Remotive.
A daily Remotive poll is a side project, not a 24h apply-early system.

### C. Google-for-Jobs proxies (JSearch ~$25–150/mo, SerpAPI Google Jobs $25–150/mo)

Broad coverage by proxy (LinkedIn / Indeed / ZipRecruiter as Google
indexed them). No webhooks; freshness commonly 24–48h behind the source;
results are SERP-shaped (snippets, unstable IDs). SerpAPI’s Production
plan ($150) adds a legal shield; Google has litigated SERP scraping,
which is supply-chain risk. **Useful as a recall complement, not as the
system of record.**

### D. JobsPipe (default candidate)

Developer jobs API over 42 named ATS/board sources (Greenhouse, Lever,
Ashby, Workday, iCIMS, SmartRecruiters, Personio, Indeed, …). Normalized
schema, cross-source dedup, parsed salary.

| Plan    | Price  | Credits/mo | Freshness     | Webhooks                         |
| ------- | ------ | ---------- | ------------- | -------------------------------- |
| Free    | $0     | 1,000      | ≤24h          | no (email Signals only, cap 3)   |
| Builder | $49    | 25,000     | sub-6h crawl  | yes; **deliveries cost 0 credits** |
| Scale   | $349   | 300,000    | sub-1h + SLA  | yes                              |

**Signals** (saved searches): re-evaluated every few minutes against
new-to-corpus postings; first-seen only (reposts do not re-fire). Builder
allows 10 Signals with HMAC webhook destinations. Evaluating a Signal
**does not consume job credits**. Vendor states median ~80 minutes from
source-seen to corpus, then alert fire within a few hours — aligned with
a 24h SLO and often much better.

JobsPipe’s LinkedIn page is explicit: they **do not scrape LinkedIn**;
they crawl upstream ATS and set `mirrored_on: ["linkedin"]` when detected.
LinkedIn-only (no ATS) posts are a documented gap.

Sandbox `POST https://api.jobspipe.dev/v1/sandbox/jobs/search` returns the
live schema with no key (probed 2026-08-29).

### E. Fantastic.jobs (~$95/mo floor)

Hourly poll of **200k+ career sites across 55 ATS platforms**, plus
`active-jb` for LinkedIn / Wellfound / YC. LinkedIn in EN countries is
indexed **hourly**. Claims 95% of new jobs discovered within 3 hours.
Pull API (no webhook): we must poll `time_frame=1h` and pay **1 credit per
job returned**. Entry paid plan **$95/mo for 20,000 jobs**. Strongest
self-serve answer if the bakeoff shows JobsPipe missing LinkedIn-only or
long-tail ATS tenants. Credit burn is the risk: unfiltered hourly ingest
will exhaust 20k; title/location filters are mandatory.

### F. TheirStack

Widest advertised catalog (hundreds of thousands of sources, 195
countries), webhooks, GTM enrichment we do not need. Starter is ~$59/mo
but only ~1,500–3,500 API credits; **webhook events consume 1 credit per
job**. For a filtered staff-eng feed that can still be dozens of events
per day, Starter is tight; Pro ~$169/mo for 10k credits is the realistic
tier. Overkill unless bakeoff recall on D/E is unacceptable.

### G. Dual index (ATS vendor + Google-for-Jobs)

JobsPipe or Fantastic.jobs as SoR, JSearch ($25 Pro / 10k requests) as a
coverage net for boards the ATS index misses. Dedup on
`(company_domain, normalized_title, location)` plus apply-URL host+path.
Cost ~$74–120/mo. Adopt only if bakeoff `gold_set_recall` on a single
vendor is < 90%.

## Decision

**1. Discovery is a paid catalog, not a crawler we maintain.**

Default production recommendation after pairing: **JobsPipe Builder at
$49/mo**, because (a) webhook + Signals cost **zero credits**, so a
preference-shaped feed does not burn the 25k allowance, (b) sub-6h crawl
meets the 24h SLO with margin, (c) 42 ATS sources include the boards that
actually originate staff-eng roles, (d) HMAC webhooks fit our existing
signed-webhook pattern, (e) the LinkedIn strategy (upstream ATS, not
session scrape) matches the personal-account constraint.

The default is **not locked until the bakeoff**. If Fantastic.jobs shows
materially better `gold_set_recall` or `p95_lag_hours` on LinkedIn-only /
Workday, spend **$95/mo** and poll hourly instead. If both miss, add
JSearch at **$25/mo** as a complement — do not replace the ATS index with
Google-for-Jobs.

**2. Ingest is webhook-first, poll-as-watchdog.**

```
Vendor Signal / job.created (HMAC)
        │
        ▼
Admin ingest Function URL  ──verify signature──► SQS (maxConcurrency 1)
        │                                              │
        │  EventBridge every 4h                        ▼
        │  posted_at_gte watchdog              normalize + idempotent upsert
        │                                              │
        └──────────────────────────────────────────────┤
                                                       ▼
                                         allowlisted ATS hydrate (GH/Lever/Ashby JSON)
                                                       │
                                                       ▼
                                         preference filter → hybrid matcher
                                                       │
                          ┌────────────────────────────┼────────────────┐
                          ▼                            ▼                ▼
                    score ≥ 85                   persist row      score 70–84
                    AND notified_at null         (New / band)     digest only
                          │
                          ▼
                    Resend immediate email
```

- Same AWS account, **Admin stack owns** the job table, worker, and
  webhook. MCP is not in this path.
- SQS `maxConcurrency: 1` (or reserved concurrency 1) so we do not
  compete with the quota-10 account.
- Idempotency key: vendor job id, plus a secondary natural key
  `sha256(company_domain + '|' + normalized_title + '|' + location)`.
- Hydrate full JD only from an **allowlist of ATS hosts** derived from
  our stored `apply_url`, never from a caller-supplied URL.
- Untrusted JD text goes through existing `stripPromptInjection` +
  `wrapUntrusted` before any model sees it.
- Vendor API keys live in Secrets Manager (ARN via SSM registry, ADR
  0001). Never log the key, the HMAC secret, or raw webhook bodies that
  contain PII.

**3. Notification SLO (the contract we will page on).**

| Metric                         | Target                                      |
| ------------------------------ | ------------------------------------------- |
| P50 `notify_at - source_seen`  | ≤ 6 hours (JobsPipe Builder crawl)          |
| P95 `notify_at - source_seen`  | ≤ 24 hours                                  |
| Immediate email                | new rows with matcher score ≥ 85            |
| Daily digest                   | new rows with score ≥ 70, 07:00 Europe/London |
| Dedup                          | one email per canonical job id              |
| Webhook silence                | 4h watchdog poll; AppErrors if both fail    |

`source_seen` is the vendor’s first-seen / `posted_at`, not “when we
happened to cron.” If the vendor did not see it, we cannot meet an SLO
against reality — that is why the bakeoff measures vendor lag separately
from our pipeline lag.

We will **not** claim “seconds after a hiring manager clicks Publish on
LinkedIn.” We **will** claim “within 24h of a public ATS posting we are
contracted to see, usually a few hours, with an immediate ping for 85+.”

**4. Matching stays ours.**

Vendors filter title/location/remote/salary. They do not know the CMS
portfolio. Hybrid white-box matcher (preference hard filters + skill
Jaccard/synonyms + lexical JD overlap) runs on ingest. LLM ATS scoring
runs only after HITL “tailor,” through the existing
`enforceResumeGenerationPolicy` / `validateFabrication` path. One
Recommended pointer per ingest window (singleton, not a TTL tag).

**5. HITL surfaces stay in admin.**

TanStack virtual infinite table, detail with gaps, one-click enqueue of
existing generation/PDF workers, status machine, 7-day snoozable
follow-up. All mutations `requireAdmin()`. New table suffix under
`TABLE_SUFFIXES`; `grantCandidateMcpDataAccess` is **not** widened.

**6. Budget (production, not hobby).**

| Line                         | Monthly (USD) | Notes                                      |
| ---------------------------- | ------------- | ------------------------------------------ |
| JobsPipe Builder (default)   | 49            | Signals/webhooks; 25k credits as headroom  |
| *or* Fantastic.jobs          | 95            | If bakeoff wins on hourly LinkedIn/ATS     |
| *optional* JSearch Pro       | 25            | Only if single-vendor recall < 90%         |
| TheirStack Pro (escape hatch)| ~169          | Only if D+E fail the gold set              |
| AWS (existing + ingest)      | ~5            | Lambda/SQS/Dynamo; no NAT; ADR 0002        |
| Resend                       | 0             | Existing domain + contact-form key         |
| **Recommended start**        | **~54**       | Builder + AWS                              |
| **Strong coverage**          | **~74–100**   | Builder+JSearch *or* Fantastic             |

JobsPipe Scale ($349) is not justified for one HITL user. Credit math:
preference-shaped staff/senior remote roles are tens per day, not 25k per
month. **Polling the full index would blow Builder; Signals/webhooks will
not.** If we ever poll Fantastic hourly, title filters are mandatory.

ADR 0002’s AWS `monthlyBudgetUsd` alarm stays a runaway backstop for
*AWS*. Vendor cards are billed to the vendor; treat them as an explicit
product cost, not as something to hide inside the $5 AWS target.

## Bakeoff (required before wiring a paid key)

Fourteen days, three sources in parallel, **no production worker yet**:

1. JobsPipe Free (1,000 jobs + 3 email Signals) — sign up, save the same
   preference query as a Signal to email.
2. Fantastic.jobs 7-day trial — hourly `active-ats` + `active-jb` with
   the same title/location filters.
3. JSearch Basic/Pro — Google-for-Jobs queries for the same title family,
   `date_posted` descending.

Gold set: 20 roles Khubaib would actually apply to during the window,
captured from ATS career pages and LinkedIn (manually, logged in as a
human). For each, record: first-seen on ATS, first-seen on LinkedIn,
first-seen in each vendor, JD completeness (full vs snippet), apply URL
quality.

Pass / fail is in `specs/job-match.md`. The winner’s key goes into
Secrets Manager only after this table is filled. Switching vendors later
is an adapter swap behind `JobBoardRepository`, not a rewrite.

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
8. Do not claim coverage the bakeoff did not measure.

## Out of scope for v1

- n8n / MacBook as system of record.
- Apify for JS-only career pages (optional later, webhook into the same
  SQS, still not LinkedIn).
- Write-capable MCP tools (“apply”, “save job”).
- Workday authenticated tenants.
- Spending $349 Scale or TheirStack Enterprise before the bakeoff fails
  cheaper options.

## Consequences

- The 24h apply-early SLO is **purchasable** at ~$50–100/mo. It is not
  free, and it is not “all jobs on earth.”
- Engineering time goes into the matcher, idempotent ingest, notify
  correctness, and HITL — not into a Greenhouse slug encyclopedia.
- If JobsPipe’s upstream-ATS LinkedIn strategy misses too many
  Easy-Apply-only posts, we pay Fantastic.jobs or JSearch rather than
  scraping LinkedIn.
- A 14-day bakeoff is the first implementation step, not a dashboard.

## References (vendor claims as of 2026-08-29)

- JobsPipe sources, pricing, Signals, LinkedIn-upstream:
  https://jobspipe.dev/sources.md, https://jobspipe.dev/pricing.md,
  https://jobspipe.dev/signals.md, https://jobspipe.dev/sources/linkedin.md
- Fantastic.jobs hourly ATS + LinkedIn: https://fantastic.jobs/api,
  https://developer.fantastic.jobs/documentation/endpoints/new-jobs
- JSearch (OpenWeb Ninja): https://www.openwebninja.com/api/jsearch
- SerpAPI Google Jobs pricing: https://serpapi.com/pricing
