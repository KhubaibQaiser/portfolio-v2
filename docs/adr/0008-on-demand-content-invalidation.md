# ADR 0008 — On-demand content invalidation via a whole-cache purge

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** Khubaib (with AI pairing)

## Context

The public site used time-based ISR only: every page `revalidate = 172800`
(48h), and CloudFront cached HTML for the same `s-maxage`. CMS edits are rare
but should appear almost instantly. With time-based ISR alone, an edit could
take 48h at the ISR layer, plus up to 48h more at the edge. The caches also
disagreed with each other: the chat system prompt used 10s, the PDF 1h, and
the pages 48h.

We considered three on-demand options:

| Option                                                    | Extra cost                                       | Notes                                                                                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next tags (`revalidateTag`) + OpenNext DynamoDB tag cache | new table, plus a DynamoDB read on every ISR hit | Admin is a separate app, so it would need a public, secret-protected revalidate route in web (a Secrets Manager secret costs $0.40/mo). Tags do not purge CloudFront. |
| Short ISR window (e.g. 60s)                               | constant DynamoDB reads                          | Never instant.                                                                                                                                                        |
| **Purge the whole cache on a domain event**               | ~$0                                              | Writes are rare and every page reads `siteConfig`, so per-entity tags buy nothing.                                                                                    |

## Decision

1. Admin server actions call `publishContentChanged()` after a committed
   write (`apps/admin/src/lib/content-publish.ts`). It puts one
   `ContentChanged` event on the existing shared EventBridge bus through the
   `ContentPublisher` port. A publish failure never fails the save.
2. The `ContentChanged` rule in WebStack targets:
   - `PurgeSiteCacheFn`, which deletes the OpenNext incremental-cache prefix
     (`_cache/`, pages + `unstable_cache` entries) and then invalidates
     CloudFront `/*`, through the `SiteCachePurger` port. OpenNext treats a
     missing object as a clean miss and renders fresh from DynamoDB.
   - `RebuildCanonicalPdfFn`, so the public PDF is rebuilt immediately.
3. Page `revalidate` (48h) stays as the safety net if an event is lost.
   Both targets keep EventBridge retries (2 attempts, 1h max event age).
4. The canonical PDF uses the same 48h window: S3 TTL and CDN `s-maxage`.
   Its rebuild sweep drops from every 5 minutes to daily, and it renews the
   copy whenever the copy would expire before the next sweep. That way
   `/api/pdf` never renders on a visitor's request just because the TTL
   lapsed.

No public endpoint, shared secret, tag table, or queue is added. Admin gets
only `events:PutEvents` on the bus. The purge Lambda can only list/delete
under `_cache/*` and invalidate its own distribution.

## Cost

At CMS-edit volume (tens per month): EventBridge custom events are $1/M,
Lambda and S3 requests fall within the free tier, and CloudFront allows
1,000 free invalidation paths per month (`/*` counts as one). Effectively
$0. Raising the chat system-prompt cache from 10s to the page window also
removes repeated DynamoDB reads. The daily PDF sweep cuts the rebuild
Lambda (1.5GB) from ~8,640 to ~30 scheduled invocations a month.

## Consequences

- An edit is visible after one purge and invalidation, typically seconds.
  The first visitor after a purge pays one uncached render per page.
- A render that started before the DynamoDB write and finishes after the
  purge can re-cache old HTML. This window is milliseconds, and the 48h
  backstop heals it. Publish a second event if it ever matters.
- Coupling to OpenNext is limited to the `CACHE_BUCKET_KEY_PREFIX` we set
  ourselves, not its per-key layout.
- Revisit per-entity tags only if the site grows to many independent pages.
