export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** SNS-AI `Number(...)` coercion. Accepts unknown so config overrides stay first-truthy like the source. */
export function snsNumber(value: unknown): number {
  return Number(value);
}

/** SNS-AI `String(...)` coercion. Accepts unknown for the same reason as `snsNumber`. */
export function snsString(value: unknown): string {
  return String(value);
}

export function mean(values: readonly number[]): number {
  return values.length ? values.reduce((left, right) => left + right, 0) / values.length : 0;
}

/**
 * SNS-AI `Math.round(x * 10) / 10` — 1-decimal rounding.
 *
 * `|| 0` normalizes a `-0` result (e.g. rounding a lift of `-0.04`) to `0`.
 * SNS-AI's real strategy JSON goes through `JSON.stringify`, which already
 * collapses `-0` to `"0"`; golden fixtures generated the same way inherit
 * that normalization, so this keeps true observable parity rather than
 * diverging from it.
 */
export function round1(value: number): number {
  return Math.round(value * 10) / 10 || 0;
}

/** SNS-AI `Math.round(x * 100) / 100` — 2-decimal rounding. Same `-0` normalization as `round1`. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}
