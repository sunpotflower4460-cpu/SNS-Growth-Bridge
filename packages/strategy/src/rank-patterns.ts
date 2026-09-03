import { FEATURE_DIMENSIONS } from './types.js';
import type { LegacyFeatureStats, LegacyStrategyPattern } from './types.js';

export interface RankPatternsResult {
  preferred: LegacyStrategyPattern[];
  avoid: LegacyStrategyPattern[];
}

/**
 * SNS-AI `buildStrategy` ranking:
 *
 * 1. Build `ranked` from every `(dimension, value)` pattern with
 *    `stat.n >= minSamplesPerPattern`, walking dimensions in
 *    `FEATURE_DIMENSIONS` order and values in first-encountered order.
 * 2. Stable-sort `ranked` by `lift` descending.
 * 3. `preferred` = `lift > 0` patterns, first 8 (post step 2's order).
 * 4. `avoid` = `lift < 0` patterns from the step-2 order, stable-sorted
 *    ascending by `lift` (worst first), first 6.
 *
 * `Array.prototype.sort` is spec-stable in Node/V8, so tied-lift patterns
 * keep their relative insertion order through both sorts — this must not be
 * "fixed" with a secondary tiebreaker key that SNS-AI does not have.
 */
export function rankPatterns(featureStats: LegacyFeatureStats, minSamplesPerPattern: number): RankPatternsResult {
  const ranked: LegacyStrategyPattern[] = [];
  for (const dimension of FEATURE_DIMENSIONS) {
    const values = featureStats[dimension] ?? {};
    for (const [value, stat] of Object.entries(values)) {
      if (stat.n >= minSamplesPerPattern) {
        ranked.push({ dimension, value, ...stat });
      }
    }
  }

  ranked.sort((left, right) => right.lift - left.lift);

  const preferred = ranked.filter((pattern) => pattern.lift > 0).slice(0, 8);
  const avoid = ranked
    .filter((pattern) => pattern.lift < 0)
    .sort((left, right) => left.lift - right.lift)
    .slice(0, 6);

  return { preferred, avoid };
}
