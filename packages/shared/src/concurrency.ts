/** Error thrown when an optimistic-concurrency write observes a stale revision. */
export class ContentConflictError extends Error {
  constructor(message = "Content changed since it was loaded. Reload and try again.") {
    super(message);
    this.name = "ContentConflictError";
  }
}

export function isContentConflictError(error: unknown): error is ContentConflictError {
  return (
    error instanceof ContentConflictError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error.name === "ConditionalCheckFailedException" ||
        error.name === "ContentConflictError"))
  );
}
