import type { GrowthFeatureDimension } from '@sns-growth-bridge/contracts';

import { AVOID_CAP, PREFERRED_CAP } from './config.js';
import type { FeatureStats, LegacyFeatureStat, LegacyStrategyPattern } from './types.js';

export function rankPatterns(
  featureStats: FeatureStats,
  minSamplesPerPattern: number,
): { preferred: LegacyStrategyPattern[]; avoid: LegacyStrategyPattern[] } {
  const ranked: LegacyStrategyPattern[] = [];
  for (const [dimension, values] of Object.entries(featureStats) as Array<
    [GrowthFeatureDimension, Record<string, LegacyFeatureStat>]
  >) {
    for (const [value, stat] of Object.entries(values)) {
      if (stat.n >= minSamplesPerPattern) {
        ranked.push({ dimension, value, ...stat });
      }
    }
  }
  ranked.sort((left, right) => right.lift - left.lift);
  const preferred = ranked.filter((pattern) => pattern.lift > 0).slice(0, PREFERRED_CAP);
  const avoid = ranked
    .filter((pattern) => pattern.lift < 0)
    .sort((left, right) => left.lift - right.lift)
    .slice(0, AVOID_CAP);
  return { preferred, avoid };
}
