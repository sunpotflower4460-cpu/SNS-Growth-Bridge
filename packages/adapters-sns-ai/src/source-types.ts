import type { GrowthFeatureDimension, GrowthStrategySnapshot } from '@sns-growth-bridge/contracts';

export interface SnsAiAdapterContext {
  producedAt: string;
  traceId: string;
}

export interface SnsAiHistoryEntrySource {
  at?: string | null;
  account?: string | null;
  platform?: string | null;
  status?: string | null;
  source?: string | null;
  slotId?: string | null;
  text?: string | null;
  textHash?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  providerPostId?: string | number | null;
  features?: Record<string, unknown> | null;
  experiment?: unknown;
  recoveredFromDurableClaim?: boolean;
  recoveryIncomplete?: boolean;
}

export interface SnsAiMetricSnapshotSource {
  collectedAt?: string | null;
  account?: string | null;
  platform?: string | null;
  providerPostId?: string | number | null;
  publishedAt?: string | null;
  checkpointMinutes?: number | null;
  actualAgeMinutes?: number | null;
  metrics?: Record<string, unknown> | null;
  warning?: string | null;
  unavailable?: string[] | null;
}

export interface SnsAiHumanFeedbackSource {
  at?: string | null;
  account?: string | null;
  action?: string | null;
  note?: string | null;
  dimension?: string | null;
  value?: string | number | null;
  source?: string | null;
  active?: boolean;
}

export interface SnsAiRuntimePolicySource {
  schemaVersion?: number;
  manualOnly?: boolean;
  requireExplicitManualInvocation?: boolean;
  allowAutomaticAccountActivation?: boolean;
  allowAutomaticEngagement?: boolean;
  allowScheduledProviderPolling?: boolean;
}

export interface SnsAiLegacyFeatureStat {
  n: number;
  averageScore: number;
  lift: number;
  confidence: number;
}

export type SnsAiLegacyFeatureStats = Partial<
  Record<GrowthFeatureDimension, Record<string, SnsAiLegacyFeatureStat>>
>;

export interface SnsAiLegacyStrategyPattern extends SnsAiLegacyFeatureStat {
  dimension: GrowthFeatureDimension;
  value: string;
}

export interface SnsAiLegacyStrategyContext {
  account: string;
  generatedAt: string;
  strategyWindowDays: number;
  sampleSize: number;
  overallScore: number;
  confidence: number;
  exploreRate: number;
  preferred: SnsAiLegacyStrategyPattern[];
  avoid: SnsAiLegacyStrategyPattern[];
  featureStats: SnsAiLegacyFeatureStats;
  guardrail: string;
}

export interface SnsAiStrategyDecisionContext {
  strategy: SnsAiLegacyStrategyContext;
  provenance: Pick<
    GrowthStrategySnapshot,
    'strategyId' | 'strategyVersion' | 'status' | 'inputsDigest' | 'sourceWindow' | 'platform'
  >;
}

export interface SnsAiStrategyConsumerIdentity {
  accountId: string;
  platform: 'x' | 'instagram';
}
