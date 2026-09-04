import { AdapterReason, type AdapterResult } from './result.js';

export function isNonEmptySourceId(value: string): boolean {
  return value.trim().length > 0;
}

export function sourceIdText(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

const ISO_DATE_TIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isIsoDateTimeSource(value: string): boolean {
  if (!ISO_DATE_TIME_WITH_OFFSET.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function blockedInvalidSourceIdentity(field: string): AdapterResult<never> {
  return { status: 'blocked', reason: `${AdapterReason.invalidSourceIdentity}: ${field}` };
}

export function blockedInvalidSourceDatetime(field: string): AdapterResult<never> {
  return { status: 'blocked', reason: `${AdapterReason.invalidSourceDatetime}: ${field}` };
}

export function requireAccountId(account: unknown): AdapterResult<string> {
  const text = sourceIdText(account);
  if (text === undefined || !isNonEmptySourceId(text)) {
    return blockedInvalidSourceIdentity('account');
  }
  return { status: 'mapped', value: text.trim() };
}
