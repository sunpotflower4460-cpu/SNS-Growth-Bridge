/**
 * Pure SNS-AI scorer parity. Schema types come from `@sns-growth-bridge/contracts`.
 */
export { PACKAGE_NAME, PACKAGE_PHASE, PARITY_TARGET_SHA, SCORER_VERSION } from './version.js';
export { ScoringInputError, isScoringInputError } from './errors.js';
export { clamp, safeRate, snsNumber, snsString } from './math.js';
export {
  DEFAULT_PLATFORM_WEIGHTS,
  defaultWeightsForPlatform,
  resolveWeights,
  type ScoreWeightKey,
  type ScoreWeights,
  type ScoreWeightsOverride,
} from './weights.js';
export { METRIC_VECTOR_KEYS, metricVectorFromRaw } from './metric-vector.js';
export { median } from './median.js';
export { baselineVector, requireAccountId, selectBaselinePeers } from './baseline.js';
export { relativeScore } from './relative-score.js';
export { scoreSnapshot, toPerformanceScore, type ScoreSnapshotResult } from './score-snapshot.js';
