import { AdapterReason, type AdapterResult } from './result.js';

/**
 * Canonical `nonEmptyString` cannot see empty source IDs once they are prefixed
 * (`my-sns::…`, `my-sns:publish-job:`). Reject those IDs at the adapter boundary.
 */
export function isNonEmptySourceId(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Matches Canonical EnvelopeMeta / publishedAt `isoDateTime`
 * (`z.iso.datetime({ offset: true })`): full date-time with `Z` or numeric offset.
 */
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
