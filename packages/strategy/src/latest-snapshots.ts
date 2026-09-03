import type { MetricSnapshot } from '@sns-growth-bridge/contracts';

import { snsString } from './math.js';

/**
 * SNS-AI `latestSnapshots` (`src/analytics/store.mjs`). Key is
 * `account + ":" + providerPostId`; Bridge maps `account` -> `subject.accountId`
 * and `providerPostId` -> `externalPostId`.
 *
 * SNS-AI keys the newest row by **`collectedAt`** (append time), which Bridge
 * maps to `capturedAt`. This is "most recently collected", not "highest
 * checkpointMinutes" — a post can have a fresh, immature snapshot recorded
 * after an older, mature one and still lose to the immature one here. Mature
 * filtering is applied by the caller *after* this selection, not before; see
 * `build-strategy.ts`.
 *
 * Ties (`collectedAt` equal) keep the first-encountered row, matching SNS-AI's
 * `new Date(row.collectedAt) > new Date(previous.collectedAt)` (strictly
 * greater-than) comparison.
 */
export function latestSnapshots(entries: readonly MetricSnapshot[]): MetricSnapshot[] {
  const map = new Map<string, MetricSnapshot>();
  for (const row of entries) {
    const key = `${snsString(row.subject.accountId)}:${snsString(row.externalPostId)}`;
    const previous = map.get(key);
    if (!previous || new Date(row.capturedAt).getTime() > new Date(previous.capturedAt).getTime()) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}
