import { getContentPublisher } from "@portfolio/data/content-publish";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

/**
 * Asks the public site to purge its caches after a committed CMS write.
 * Never fails the save: on error the site still refreshes within its ISR window.
 * Not a server action — call it only after `requireAdmin()` and a successful write.
 */
export async function publishContentChanged(): Promise<void> {
  const publisher = getContentPublisher();
  if (!publisher) return;
  try {
    await publisher.publishContentChanged();
  } catch (error) {
    logger.warn(
      "content change publish failed; public site refreshes on its ISR window",
      {
        error: toError(error),
      },
    );
  }
}
