import { FEATURE_DIMENSIONS } from './types.js';
import type { LegacyFeatureStat, LegacyFeatureStats, StrategyPatternEvidence, StrategySample } from './types.js';
import { clamp, mean, round1, round2, snsString } from './math.js';

export interface FeatureStatsResult {
  featureStats: LegacyFeatureStats;
  patternEvidence: StrategyPatternEvidence[];
}

/**
 * SNS-AI `buildStrategy` feature-grouping loop. Every dimension in
 * `FEATURE_DIMENSIONS` gets a `featureStats[dimension]` entry (possibly `{}`)
 * even with zero samples, matching `Object.fromEntries([...groups.entries()])`
 * always being assigned per dimension.
 *
 * Group insertion order follows first-encountered order across `samples`
 * (a `Map`, like SNS-AI), which later feeds the stable lift sort in
 * `rank-patterns.ts`.
 *
 * Feature confidence denominator is fixed at `6` — unrelated to
 * `fullConfidencePosts`.
 */
export function computeFeatureStats(samples: readonly StrategySample[], overallScore: number): FeatureStatsResult {
  const featureStats: LegacyFeatureStats = {};
  const patternEvidence: StrategyPatternEvidence[] = [];

  for (const dimension of FEATURE_DIMENSIONS) {
    const groupScores = new Map<string, number[]>();
    const groupPostIds = new Map<string, string[]>();

    for (const sample of samples) {
      const value = snsString(sample.features[dimension] || '').trim();
      if (!value) {
        continue;
      }
      if (!groupScores.has(value)) {
        groupScores.set(value, []);
        groupPostIds.set(value, []);
      }
      groupScores.get(value)?.push(sample.score);
      groupPostIds.get(value)?.push(sample.externalPostId);
    }

    const dimensionStats: Record<string, LegacyFeatureStat> = {};
    for (const [value, scores] of groupScores) {
      dimensionStats[value] = {
        n: scores.length,
        averageScore: round1(mean(scores)),
        lift: round1(mean(scores) - overallScore),
        confidence: round2(clamp(scores.length / 6, 0, 1)),
      };
      patternEvidence.push({ dimension, value, externalPostIds: groupPostIds.get(value) ?? [] });
    }
    featureStats[dimension] = dimensionStats;
  }

  return { featureStats, patternEvidence };
}
