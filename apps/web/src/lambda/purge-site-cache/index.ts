import { createLogger } from "@portfolio/observability";
import { createSiteCachePurgerFromEnv } from "@portfolio/data/site-cache";

const logger = createLogger({ serviceName: "portfolio-web-purge-site-cache" });

/**
 * EventBridge `ContentChanged` target (WebStack). Drops the ISR cache and the
 * CloudFront copy so the next visitor renders fresh CMS content. Throwing lets
 * Lambda's async retries run; the page `revalidate` window is the backstop.
 */
export async function handler(): Promise<void> {
  try {
    const result = await createSiteCachePurgerFromEnv().purgeAll();
    logger.info("site cache purged after content change", result);
  } catch (error) {
    logger.error("site cache purge failed", {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }
}
