import type { GrowthFeatureDimension, MetricSnapshot } from '@sns-growth-bridge/contracts';
import type { ScoreWeightsOverride } from '@sns-growth-bridge/scoring';

/**
 * SNS-AI `FEATURE_DIMENSIONS` (`src/learning/features.mjs`). Order is
 * behavior — it drives `ranked` insertion order before the lift sort, so it
 * must not be reordered or extended.
 */
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

export const GUARDRAIL_TEXT =
  'Treat these as recent evidence, not identity. Never override profile, safety rules, or explicit human instructions.';

/**
 * Internal parity input standing in for SNS-AI `data/history.jsonl` rows.
 *
 * Canonical `PublishedPostSnapshot` has no `mediaUrl`; how a future adapter
 * derives `hasLegacyMediaUrl` from a canonical snapshot is a Phase 5+
 * decision. This type is Parity-Core-only.
 */
export interface StrategyPostEvidence {
  accountId: string;
  externalPostId: string;
  publishedAt: string;
  features: Partial<Record<GrowthFeatureDimension, string>>;
  hasLegacyMediaUrl: boolean;
}

/**
 * Source-neutral learning config. Mirrors `account.learning` /
 * `account.objectives.weights` from SNS-AI `config/accounts.json`, but never
 * imports the whole account config object.
 */
export interface StrategyLearningConfig {
  strategyWindowDays?: number;
  matureCheckpointMinutes?: number;
  minSamplesPerPattern?: number;
  fullConfidencePosts?: number;
  exploreRate?: number;
  timezone?: string;
  scoreWeights?: ScoreWeightsOverride;
}

export interface StrategySample {
  externalPostId: string;
  score: number;
  scoreConfidence: number;
  features: Partial<Record<GrowthFeatureDimension, string>>;
}

export interface LegacyFeatureStat {
  n: number;
  averageScore: number;
  lift: number;
  confidence: number;
}

export interface LegacyStrategyPattern extends LegacyFeatureStat {
  dimension: GrowthFeatureDimension;
  value: string;
}

export type LegacyFeatureStats = Partial<Record<GrowthFeatureDimension, Record<string, LegacyFeatureStat>>>;

/**
 * SNS-AI `buildStrategy()` return shape, field-for-field. Compared with
 * `toEqual` against golden fixtures generated from the frozen reference —
 * do not add Bridge-only fields here; those belong on the canonical
 * projection instead.
 */
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
  featureStats: LegacyFeatureStats;
  guardrail: string;
}

/**
 * Sidecar evidence collected during feature grouping. Not present on
 * `StrategyParityResult` (that must equal SNS-AI exactly); used only by
 * `projectToGrowthStrategySnapshot` to fill `StrategyPattern.evidencePostIds`.
 */
export interface StrategyPatternEvidence {
  dimension: GrowthFeatureDimension;
  value: string;
  externalPostIds: string[];
}

export interface BuildStrategyParityInput {
  accountId: string;
  history: readonly StrategyPostEvidence[];
  snapshots: readonly MetricSnapshot[];
  now: Date;
  config?: StrategyLearningConfig;
}

export interface BuildStrategyParityResult {
  parity: StrategyParityResult;
  patternEvidence: StrategyPatternEvidence[];
}
