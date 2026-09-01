export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** SNS-AI `Number(...)` coercion. Accepts unknown so optional raw fields stay first-truthy. */
export function snsNumber(value: unknown): number {
  return Number(value);
}

export function snsString(value: unknown): string {
  return String(value);
}

/** SNS-AI `safeRate`: exposure > 0 ? Number(value || 0) / exposure : 0 */
export function safeRate(value: unknown, exposure: number): number {
  return exposure > 0 ? snsNumber(value || 0) / exposure : 0;
}
