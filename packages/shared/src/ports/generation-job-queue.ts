export type GenerationJobQueueMessage = {
  jobId: string;
};

/**
 * Fire-and-forget dispatch for async AI generation jobs — SQS in production,
 * so the worker Lambda can run off any CloudFront/HTTP request path with its
 * own long timeout. See {@link GenerationJobStore} for the durable job
 * record this message id points at.
 */
export type GenerationJobQueue = {
  enqueue(message: GenerationJobQueueMessage): Promise<void>;
};
