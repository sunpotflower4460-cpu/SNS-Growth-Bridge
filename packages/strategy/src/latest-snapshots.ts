import type { MetricSnapshot } from '@sns-growth-bridge/contracts';

/**
 * SNS-AI `latestSnapshots`: newest `collectedAt` per (account, providerPostId).
 * Bridge uses `capturedAt` for `collectedAt` and `subject.accountId` / `externalPostId`.
 *
 * Does not pick the maximum checkpoint. Equal timestamps keep the first row.
 */
export function latestSnapshots(entries: readonly MetricSnapshot[]): MetricSnapshot[] {
  const map = new Map<string, MetricSnapshot>();
  for (const row of entries) {
    const key = `${row.subject.accountId ?? ''}:${row.externalPostId}`;
    const previous = map.get(key);
    if (!previous || new Date(row.capturedAt) > new Date(previous.capturedAt)) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}
