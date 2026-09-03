/**
 * Pure SNS-AI strategy learning parity. Schema types come from
 * `@sns-growth-bridge/contracts`; scoring is reused unmodified from
 * `@sns-growth-bridge/scoring`.
 */
export { PACKAGE_NAME, PACKAGE_PHASE, PARITY_TARGET_SHA, LEARN_MJS_BLOB_SHA, STRATEGY_VERSION } from './version.js';
export {
  FEATURE_DIMENSIONS,
  GUARDRAIL_TEXT,
  type BuildStrategyParityInput,
  type BuildStrategyParityResult,
  type LegacyFeatureStat,
  type LegacyFeatureStats,
  type LegacyStrategyPattern,
  type StrategyLearningConfig,
  type StrategyParityResult,
  type StrategyPatternEvidence,
  type StrategyPostEvidence,
  type StrategySample,
} from './types.js';
export { latestSnapshots } from './latest-snapshots.js';
export { historyFeatures } from './history-features.js';
export { computeFeatureStats, type FeatureStatsResult } from './feature-stats.js';
export { rankPatterns, type RankPatternsResult } from './rank-patterns.js';
export { buildStrategyParity } from './build-strategy.js';
export {
  projectToGrowthStrategySnapshot,
  type CanonicalStrategyProjectionInput,
} from './canonical-projection.js';
