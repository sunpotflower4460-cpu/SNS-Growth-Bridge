import type { ZodError } from 'zod';

export class ContractValidationError extends Error {
  readonly contract: string;
  readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(contract: string, issues: ReadonlyArray<{ path: string; message: string }>) {
    const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    super(`${contract} validation failed: ${summary}`);
    this.name = 'ContractValidationError';
    this.contract = contract;
    this.issues = issues;
  }

  static fromZod(contract: string, error: ZodError): ContractValidationError {
    const issues = error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
      message: issue.message,
    }));
    return new ContractValidationError(contract, issues);
  }
}

export function isContractValidationError(value: unknown): value is ContractValidationError {
  return value instanceof ContractValidationError;
}
