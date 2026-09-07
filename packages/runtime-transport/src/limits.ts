import type { TransportResult } from './types.js';

export function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function resolvePositiveIntLimit(
  override: number | undefined,
  fallback: number,
  reason: string,
): TransportResult<number> {
  const value = override === undefined ? fallback : override;
  if (!isPositiveInt(value)) {
    return { status: 'blocked', reason };
  }
  return { status: 'mapped', value };
}
