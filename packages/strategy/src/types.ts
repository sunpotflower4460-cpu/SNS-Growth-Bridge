import type { GrowthFeatureDimension, MetricSnapshot } from '@sns-growth-bridge/contracts';
import type { ScoreWeightsOverride } from '@sns-growth-bridge/scoring';

export const FEATURE_DIMENSIONS = [
  'topic',
  'angle',
  'hook',
  'emotion',
  'format',
  'cta',
  'mediaDecision',
  'postingHour',
] as const satisfies readonly GrowthFeatureDimension[];

export type { GrowthFeatureDimension };

/**
 * Internal parity input. Canonical `PublishedPostSnapshot` has no `mediaUrl`.
 * Adapter mapping from Canonical → this shape is Phase 5, not Phase 4.
 */
export interface StrategyPostEvidence {
  accountId: string;
  /** Empty/missing is excluded, matching SNS-AI falsy `providerPostId`. */
  externalPostId: string;
  /** SNS-AI history `at`. */
  publishedAt: string;
  features: Partial<Record<GrowthFeatureDimension, string>>;
  /** Stand-in for SNS-AI history `mediaUrl` truthiness. */
  hasLegacyMediaUrl: boolean;
}

export interface StrategyLearningConfig {
  strategyWindowDays?: number;
  matureCheckpointMinutes?: number;
  minSamplesPerPattern?: number;
  fullConfidencePosts?: number;
  exploreRate?: number;
  timezone?: string;
  scoreWeights?: ScoreWeightsOverride;
}

export interface BuildStrategyParityInput {
  accountId: string;
  now: Date | string;
  posts: readonly StrategyPostEvidence[];
  snapshots: readonly MetricSnapshot[];
  config?: StrategyLearningConfig;
}

export interface StrategySample {
  externalPostId: string;
  score: number;
  /** Phase 3 scorer confidence. Present on the sample; not used for featureStats weighting. */
  scoreConfidence: number;
  features: Partial<Record<GrowthFeatureDimension, string>>;
}

export interface LegacyFeatureStat {
  n: number;
  averageScore: number;
  lift: number;
  confidence: number;
}

export type FeatureStats = Record<GrowthFeatureDimension, Record<string, LegacyFeatureStat>>;

export type PatternEvidence = Record<GrowthFeatureDimension, Record<string, string[]>>;

export interface LegacyStrategyPattern extends LegacyFeatureStat {
  dimension: GrowthFeatureDimension;
  value: string;
}

/** SNS-AI `buildStrategy()` JSON shape. Golden tests compare this, not Canonical. */
export interface StrategyParityResult {
  account: string;
  generatedAt: string;
  strategyWindowDays: number;
  sampleSize: number;
  overallScore: number;
  confidence: number;
  exploreRate: number;
  preferred: LegacyStrategyPattern[];
  avoid: LegacyStrategyPattern[];
  featureStats: FeatureStats;
  guardrail: string;
}

export interface StrategyParityBundle {
  parity: StrategyParityResult;
  patternEvidence: PatternEvidence;
}
