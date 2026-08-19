export type RenderJobQueueMessage = {
  jobId: string;
};

/**
 * Fire-and-forget dispatch for async PDF render jobs — SQS in production, so
 * the worker Lambda can run off any CloudFront/HTTP request path with its own
 * long timeout. See {@link RenderJobStore} for the durable job record this
 * message id points at.
 */
export type RenderJobQueue = {
  enqueue(message: RenderJobQueueMessage): Promise<void>;
};
