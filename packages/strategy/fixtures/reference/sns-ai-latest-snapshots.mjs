/**
 * Frozen copy of SNS-AI `latestSnapshots` from `src/analytics/store.mjs` at
 * 914c70ee4666015f93603eef9a2f3dd9a1a7de08
 * (blob 9075598f8c7507c08bea5b77e42cc33078996afa).
 *
 * JSONL read/write is not frozen. Latest-by-collectedAt semantics only.
 * Frozen parity reference. Do not improve.
 *
 * Bridge MetricSnapshot.capturedAt maps to SNS-AI collectedAt.
 */
export function latestSnapshots(entries) {
  const map = new Map();
  for (const row of entries || []) {
    const key = `${row.account}:${row.providerPostId}`;
    const previous = map.get(key);
    if (!previous || new Date(row.collectedAt) > new Date(previous.collectedAt)) map.set(key, row);
  }
  return [...map.values()];
}
