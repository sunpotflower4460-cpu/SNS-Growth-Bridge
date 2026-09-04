/**
 * Canonical growth and creator-support contracts.
 *
 * Schema major 1. Runtime-validated. No adapters, scoring, or provider I/O.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/contracts' as const;

export const PACKAGE_PHASE = 2 as const;

export { CURRENT_SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS } from './schema-version.js';
export { ContractValidationError, isContractValidationError } from './errors.js';
export { envelopeMetaSchema, producerSchema, type EnvelopeMeta, type Producer } from './envelope.js';
export { growthSubjectRefSchema, type GrowthSubjectRef } from './identity.js';
export {
  platformSchema,
  growthFeatureDimensionSchema,
  type Platform,
  type GrowthFeatureDimension,
} from './platform.js';
export {
  creatorHardRuleSchema,
  creatorProfileSnapshotSchema,
  publishedMediaSnapshotSchema,
  type CreatorHardRule,
  type CreatorProfileSnapshot,
  type PublishedMediaSnapshot,
} from './profile.js';
export {
  deriveChangedFields,
  draftContentSnapshotSchema,
  humanCorrectionEventSchema,
  isHumanCorrectionContent,
  type DraftContentSnapshot,
  type DraftField,
  type HumanCorrectionEvent,
} from './correction.js';
export { explicitFeedbackEventSchema, type ExplicitFeedbackEvent } from './feedback.js';
export { publishedPostSnapshotSchema, type PublishedPostSnapshot } from './published-post.js';
export {
  metricSnapshotSchema,
  normalizedMetricVectorSchema,
  performanceScoreSchema,
  rawMetricVectorSchema,
  type MetricSnapshot,
  type NormalizedMetricVector,
  type PerformanceScore,
  type RawMetricVector,
} from './metrics.js';
export {
  adviceItemSchema,
  candidateAdviceSchema,
  growthStrategySnapshotSchema,
  humanPreferencePatternSchema,
  humanPreferenceSummarySchema,
  strategyFeatureStatSchema,
  strategyFeatureStatsSchema,
  strategyPatternSchema,
  type AdviceItem,
  type CandidateAdvice,
  type GrowthStrategySnapshot,
  type HumanPreferencePattern,
  type HumanPreferenceSummary,
  type StrategyFeatureStat,
  type StrategyFeatureStats,
  type StrategyPattern,
} from './strategy.js';
export {
  experimentAssignmentSchema,
  experimentDefinitionSchema,
  experimentResultSchema,
  type ExperimentAssignment,
  type ExperimentDefinition,
  type ExperimentResult,
} from './experiments.js';
export {
  assetRequestSchema,
  captureRequestSchema,
  creatorActionRecommendationSchema,
  creatorRequestedActionSchema,
  informationRequestSchema,
  profileUpdateRequestSchema,
  recommendationRationaleSchema,
  type AssetRequest,
  type CaptureRequest,
  type CreatorActionRecommendation,
  type CreatorActionType,
  type CreatorRequestedAction,
  type DurationSeconds,
  type Framing,
  type InformationRequest,
  type MediaType,
  type Orientation,
  type ProfileUpdateRequest,
  type RecommendationRationale,
} from './creator-action.js';
export {
  anchorEntitySchema,
  humanAnchorEventSchema,
  orbitItemSchema,
  orbitPlanSchema,
  scheduleAdjustmentRecommendationSchema,
  type AnchorEntity,
  type HumanAnchorEvent,
  type HumanAnchorSource,
  type OrbitItem,
  type OrbitItemType,
  type OrbitPlan,
  type ScheduleAdjustmentAction,
  type ScheduleAdjustmentRecommendation,
} from './anchor-orbit.js';
export {
  parseCandidateAdvice,
  parseContract,
  parseCreatorActionRecommendation,
  parseCreatorProfileSnapshot,
  parseEnvelopeMeta,
  parseExperimentDefinition,
  parseExperimentResult,
  parseExplicitFeedbackEvent,
  parseGrowthStrategySnapshot,
  parseGrowthSubjectRef,
  parseHumanAnchorEvent,
  parseHumanCorrectionEvent,
  parseHumanPreferenceSummary,
  parseMetricSnapshot,
  parseOrbitPlan,
  parsePublishedPostSnapshot,
  parseRawMetricVector,
  parseScheduleAdjustmentRecommendation,
} from './parse.js';
