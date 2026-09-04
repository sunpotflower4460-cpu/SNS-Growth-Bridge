import type { MetricSnapshot } from '@sns-growth-bridge/contracts';
import { scoreSnapshot, snsNumber, snsString, type ScoreWeightsOverride } from '@sns-growth-bridge/scoring';

import { historyFeatures } from './history-features.js';
import { latestSnapshots } from './latest-snapshots.js';
import type { StrategyPostEvidence, StrategySample } from './types.js';

export function resolveNow(now: Date | string): Date {
  return now instanceof Date ? now : new Date(now);
}

export function selectRecentPosts(
  posts: readonly StrategyPostEvidence[],
  accountId: string,
  cutoffMs: number,
): StrategyPostEvidence[] {
  return posts.filter(
    (post) => post.accountId === accountId && post.externalPostId && Date.parse(post.publishedAt) >= cutoffMs,
  );
}

export function allowedPostIdsFromHistory(recentHistory: readonly StrategyPostEvidence[]): Set<string> {
  return new Set(recentHistory.map((post) => snsString(post.externalPostId)));
}

export function selectWindowSnapshots(
  snapshots: readonly MetricSnapshot[],
  accountId: string,
  allowedPostIds: ReadonlySet<string>,
): MetricSnapshot[] {
  return snapshots.filter(
    (snapshot) => snapshot.subject.accountId === accountId && allowedPostIds.has(snsString(snapshot.externalPostId)),
  );
}

export function selectMatureLatestSnapshots(
  windowSnapshots: readonly MetricSnapshot[],
  matureCheckpointMinutes: number,
): MetricSnapshot[] {
  return latestSnapshots(windowSnapshots).filter(
    (snapshot) => snsNumber(snapshot.checkpointMinutes) >= snsNumber(matureCheckpointMinutes),
  );
}

/** Later history rows with the same externalPostId overwrite earlier ones. */
export function historyByExternalPostId(
  recentHistory: readonly StrategyPostEvidence[],
): Map<string, StrategyPostEvidence> {
  return new Map(recentHistory.map((post) => [snsString(post.externalPostId), post]));
}

export function buildSamples(
  matureLatest: readonly MetricSnapshot[],
  windowSnapshots: readonly MetricSnapshot[],
  byPost: ReadonlyMap<string, StrategyPostEvidence>,
  timeZone: string,
  scoreWeights: ScoreWeightsOverride,
): StrategySample[] {
  return matureLatest
    .map((snapshot) => {
      const post = byPost.get(snsString(snapshot.externalPostId));
      if (!post) {
        return null;
      }
      const scored = scoreSnapshot(snapshot, windowSnapshots, scoreWeights);
      return {
        externalPostId: snsString(snapshot.externalPostId),
        score: scored.score,
        scoreConfidence: scored.confidence,
        features: historyFeatures(post, timeZone),
      };
    })
    .filter((sample): sample is StrategySample => sample !== null);
}
