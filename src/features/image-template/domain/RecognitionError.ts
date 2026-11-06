/**
 * Structured error for the recognition pipeline.
 *
 * Unlike a bare `Error('recognition.invalid_result')`, this carries the
 * original cause so the boundary (recognitionClient) can log it and,
 * in dev, surface it to the caller without leaking internals to users.
 */
export class RecognitionError extends Error {
  constructor(
    readonly code: string,
    readonly detail?: string,
    cause?: unknown,
  ) {
    super(code, cause !== undefined ? { cause } : undefined);
    this.name = 'RecognitionError';
  }
}