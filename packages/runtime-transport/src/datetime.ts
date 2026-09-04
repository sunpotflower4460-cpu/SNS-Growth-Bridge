const ISO_DATE_TIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isIsoDateTimeWithOffset(value: string): boolean {
  if (!ISO_DATE_TIME_WITH_OFFSET.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}
