/**
 * EventBridge contract between the admin (publisher) and the web stack's
 * cache-purge rule (consumer). SDK-free so CDK can import it.
 */
export const CONTENT_CHANGED_EVENT = {
  source: "portfolio.admin",
  detailType: "ContentChanged",
} as const;
