export class ScoringInputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ScoringInputError';
    this.code = code;
  }
}

export function isScoringInputError(value: unknown): value is ScoringInputError {
  return value instanceof ScoringInputError;
}
