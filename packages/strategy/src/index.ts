/**
 * Pure SNS-AI strategy-learning parity (`sns-ai-learn-parity-v1`).
 *
 * `buildStrategyParity()` matches SNS-AI `buildStrategy()`.
 * `projectToGrowthStrategySnapshot()` adds Bridge Canonical fields separately.
 */
export { PACKAGE_NAME, PACKAGE_PHASE, STRATEGY_VERSION, PARITY_TARGET_SHA, LEARN_BLOB_SHA } from './version.js';
export {
  DEFAULT_STRATEGY_WINDOW_DAYS,
  DEFAULT_MATURE_CHECKPOINT_MINUTES,
  DEFAULT_MIN_SAMPLES_PER_PATTERN,
  DEFAULT_FULL_CONFIDENCE_POSTS,
  DEFAULT_EXPLORE_RATE,
  DEFAULT_TIMEZONE,
  PREFERRED_CAP,
  AVOID_CAP,
  FEATURE_CONFIDENCE_DENOMINATOR,
  STRATEGY_GUARDRAIL,
} from './config.js';
export { FEATURE_DIMENSIONS, type GrowthFeatureDimension } from './types.js';
export type {
  StrategyPostEvidence,
  StrategyLearningConfig,
  BuildStrategyParityInput,
  StrategySample,
  LegacyFeatureStat,
  FeatureStats,
  PatternEvidence,
  LegacyStrategyPattern,
  StrategyParityResult,
  StrategyParityBundle,
} from './types.js';
export { historyFeatures } from './history-features.js';
export { latestSnapshots } from './latest-snapshots.js';
export { buildStrategyParity } from './build-strategy.js';
export {
  projectToGrowthStrategySnapshot,
  type CanonicalStrategyProjectionInput,
} from './canonical-projection.js';
