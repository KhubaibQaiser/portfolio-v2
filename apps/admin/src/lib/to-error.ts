/** Normalize unknown thrown values for structured logging (Powertools `error` key). */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
