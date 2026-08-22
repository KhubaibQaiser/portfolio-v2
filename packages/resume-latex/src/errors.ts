export class LatexCompileError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "LatexCompileError";
  }
}

export class ResumeVerifyError extends Error {
  constructor(
    message: string,
    readonly checklistItem?: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ResumeVerifyError";
  }
}
