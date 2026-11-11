/**
 * Signals that public-site content changed so caches can be purged on demand.
 * Production publishes an EventBridge event; local dev has no publisher.
 */
export type ContentPublisher = {
  publishContentChanged(): Promise<void>;
};
