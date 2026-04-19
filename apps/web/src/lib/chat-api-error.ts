/**
 * JSON error body for non-streaming responses from POST `/api/chat`.
 * Rate limits (429) may include `retryAfterSeconds`.
 */
export type ChatApiErrorBody = {
  error: string;
  retryAfterSeconds?: number;
};
