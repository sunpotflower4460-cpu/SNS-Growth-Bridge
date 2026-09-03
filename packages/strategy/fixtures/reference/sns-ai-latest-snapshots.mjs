/**
 * Frozen copy of the relevant part of SNS-AI `src/analytics/store.mjs` at
 * 914c70ee4666015f93603eef9a2f3dd9a1a7de08
 * (blob 9075598f8c7507c08bea5b77e42cc33078996afa).
 *
 * Byte-identical to the Phase 0 / Phase 3 reference SHA
 * 3bd90cc8ac80da84df949799dd4b8be2dc109767 — see
 * docs/phase4/STRATEGY_SOURCE_AUDIT.md.
 *
 * JSONL read/write (`readMetricSnapshots`, `appendMetricSnapshot`) is not
 * ported — Phase 4 is pure logic only. `latestSnapshots` is the pure
 * function `buildStrategy()` depends on.
 *
 * Do not "improve" this file. Golden expected outputs are generated from it.
 */
export function snapshotsForPost(entries, account, providerPostId) {
  return (entries || []).filter((row) => row.account === account && String(row.providerPostId) === String(providerPostId));
}

export function latestSnapshots(entries) {
  const map = new Map();
  for (const row of entries || []) {
    const key = `${row.account}:${row.providerPostId}`;
    const previous = map.get(key);
    if (!previous || new Date(row.collectedAt) > new Date(previous.collectedAt)) map.set(key, row);
  }
  return [...map.values()];
}
