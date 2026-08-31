import type { MetricSnapshot, NormalizedMetricVector } from '@sns-growth-bridge/contracts';

import { ScoringInputError } from './errors.js';
import { snsNumber, snsString } from './math.js';
import { METRIC_VECTOR_KEYS, metricVectorFromRaw } from './metric-vector.js';
import { median } from './median.js';

export function requireAccountId(snapshot: MetricSnapshot): string {
  const accountId = snapshot.subject.accountId;
  if (!accountId) {
    throw new ScoringInputError(
      'missing_account_id',
      'scoreSnapshot requires subject.accountId; workspaceId/creatorId are not account-relative baseline keys',
    );
  }
  return accountId;
}

/**
 * SNS-AI peer selection:
 * 1. same account, platform, checkpointMinutes, different providerPostId
 * 2. else same account, platform, different providerPostId (any checkpoint)
 *
 * Bridge maps account → subject.accountId and providerPostId → externalPostId.
 */
export function selectBaselinePeers(target: MetricSnapshot, peers: readonly MetricSnapshot[]): MetricSnapshot[] {
  const accountId = requireAccountId(target);
  const sameAccountPlatform = peers.filter(
    (row) =>
      row.subject.accountId === accountId &&
      row.platform === target.platform &&
      snsString(row.externalPostId) !== snsString(target.externalPostId),
  );
  const sameCheckpoint = sameAccountPlatform.filter(
    (row) => snsNumber(row.checkpointMinutes) === snsNumber(target.checkpointMinutes),
  );
  return sameCheckpoint.length > 0 ? sameCheckpoint : [...sameAccountPlatform];
}

export function baselineVector(
  target: MetricSnapshot,
  peers: readonly MetricSnapshot[],
): { count: number; vector: NormalizedMetricVector } {
  requireAccountId(target);
  const selected = selectBaselinePeers(target, peers);
  const vectors = selected.map((row) => metricVectorFromRaw(row.metrics));
  return {
    count: vectors.length,
    vector: Object.fromEntries(
      METRIC_VECTOR_KEYS.map((key) => [key, median(vectors.map((vector) => vector[key]))]),
    ) as NormalizedMetricVector,
  };
}
