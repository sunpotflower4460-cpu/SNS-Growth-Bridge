import type { z } from 'zod';

import { orbitPlanSchema, humanAnchorEventSchema, scheduleAdjustmentRecommendationSchema } from './anchor-orbit.js';
import type { HumanAnchorEvent, OrbitPlan, ScheduleAdjustmentRecommendation } from './anchor-orbit.js';
import { candidateAdviceSchema, growthStrategySnapshotSchema, humanPreferenceSummarySchema } from './strategy.js';
import type { CandidateAdvice, GrowthStrategySnapshot, HumanPreferenceSummary } from './strategy.js';
import { creatorActionRecommendationSchema } from './creator-action.js';
import type { CreatorActionRecommendation } from './creator-action.js';
import { humanCorrectionEventSchema } from './correction.js';
import type { HumanCorrectionEvent } from './correction.js';
import { envelopeMetaSchema } from './envelope.js';
import type { EnvelopeMeta } from './envelope.js';
import { ContractValidationError } from './errors.js';
import { experimentDefinitionSchema, experimentResultSchema } from './experiments.js';
import type { ExperimentDefinition, ExperimentResult } from './experiments.js';
import { explicitFeedbackEventSchema } from './feedback.js';
import type { ExplicitFeedbackEvent } from './feedback.js';
import { growthSubjectRefSchema } from './identity.js';
import type { GrowthSubjectRef } from './identity.js';
import { metricSnapshotSchema, rawMetricVectorSchema } from './metrics.js';
import type { MetricSnapshot, RawMetricVector } from './metrics.js';
import { creatorProfileSnapshotSchema } from './profile.js';
import type { CreatorProfileSnapshot } from './profile.js';
import { publishedPostSnapshotSchema } from './published-post.js';
import type { PublishedPostSnapshot } from './published-post.js';

export function parseContract<T>(contract: string, schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ContractValidationError.fromZod(contract, result.error);
  }
  return result.data;
}

export function parseEnvelopeMeta(input: unknown): EnvelopeMeta {
  return parseContract('EnvelopeMeta', envelopeMetaSchema, input);
}

export function parseGrowthSubjectRef(input: unknown): GrowthSubjectRef {
  return parseContract('GrowthSubjectRef', growthSubjectRefSchema, input);
}

export function parseCreatorProfileSnapshot(input: unknown): CreatorProfileSnapshot {
  return parseContract('CreatorProfileSnapshot', creatorProfileSnapshotSchema, input);
}

export function parseHumanCorrectionEvent(input: unknown): HumanCorrectionEvent {
  return parseContract('HumanCorrectionEvent', humanCorrectionEventSchema, input);
}

export function parseExplicitFeedbackEvent(input: unknown): ExplicitFeedbackEvent {
  return parseContract('ExplicitFeedbackEvent', explicitFeedbackEventSchema, input);
}

export function parsePublishedPostSnapshot(input: unknown): PublishedPostSnapshot {
  return parseContract('PublishedPostSnapshot', publishedPostSnapshotSchema, input);
}

export function parseRawMetricVector(input: unknown): RawMetricVector {
  return parseContract('RawMetricVector', rawMetricVectorSchema, input);
}

export function parseMetricSnapshot(input: unknown): MetricSnapshot {
  return parseContract('MetricSnapshot', metricSnapshotSchema, input);
}

export function parseGrowthStrategySnapshot(input: unknown): GrowthStrategySnapshot {
  return parseContract('GrowthStrategySnapshot', growthStrategySnapshotSchema, input);
}

export function parseHumanPreferenceSummary(input: unknown): HumanPreferenceSummary {
  return parseContract('HumanPreferenceSummary', humanPreferenceSummarySchema, input);
}

export function parseCandidateAdvice(input: unknown): CandidateAdvice {
  return parseContract('CandidateAdvice', candidateAdviceSchema, input);
}

export function parseExperimentDefinition(input: unknown): ExperimentDefinition {
  return parseContract('ExperimentDefinition', experimentDefinitionSchema, input);
}

export function parseExperimentResult(input: unknown): ExperimentResult {
  return parseContract('ExperimentResult', experimentResultSchema, input);
}

export function parseCreatorActionRecommendation(input: unknown): CreatorActionRecommendation {
  return parseContract('CreatorActionRecommendation', creatorActionRecommendationSchema, input);
}

export function parseHumanAnchorEvent(input: unknown): HumanAnchorEvent {
  return parseContract('HumanAnchorEvent', humanAnchorEventSchema, input);
}

export function parseOrbitPlan(input: unknown): OrbitPlan {
  return parseContract('OrbitPlan', orbitPlanSchema, input);
}

export function parseScheduleAdjustmentRecommendation(input: unknown): ScheduleAdjustmentRecommendation {
  return parseContract('ScheduleAdjustmentRecommendation', scheduleAdjustmentRecommendationSchema, input);
}
