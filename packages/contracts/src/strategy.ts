import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { growthFeatureDimensionSchema, platformSchema } from './platform.js';
import {
  confidence,
  isoDateTime,
  isIsoDateTimeRangeOrdered,
  nonEmptyString,
  nonNegativeInt,
  positiveInt,
  score100,
} from './primitives.js';

export const strategyPatternSchema = z.object({
  dimension: growthFeatureDimensionSchema,
  value: nonEmptyString,
  sampleSize: positiveInt,
  averageScore: score100,
  lift: z.number(),
  confidence,
  rationale: nonEmptyString,
  evidencePostIds: z.array(nonEmptyString),
});

export type StrategyPattern = z.infer<typeof strategyPatternSchema>;

/**
 * Full per-feature evidence used by SNS-AI candidate ranking.
 * This is additive within schema major 1: older snapshots may omit it, but
 * consumers that need exact SNS-AI ranking parity must fail closed when an
 * active strategy does not provide it.
 */
export const strategyFeatureStatSchema = z.object({
  sampleSize: positiveInt,
  averageScore: score100,
  lift: z.number(),
  confidence,
});

export type StrategyFeatureStat = z.infer<typeof strategyFeatureStatSchema>;

export const strategyFeatureStatsSchema = z.partialRecord(
  growthFeatureDimensionSchema,
  z.record(nonEmptyString, strategyFeatureStatSchema),
);

export type StrategyFeatureStats = z.infer<typeof strategyFeatureStatsSchema>;

export const growthStrategySnapshotSchema = z
  .object({
    meta: envelopeMetaSchema,
    strategyId: nonEmptyString,
    strategyVersion: nonEmptyString,
    subject: growthSubjectRefSchema,
    platform: platformSchema,
    generatedAt: isoDateTime,
    sourceWindow: z
      .object({
        from: isoDateTime,
        to: isoDateTime,
        strategyWindowDays: positiveInt,
        matureCheckpointMinutes: positiveInt,
      })
      .superRefine((value, ctx) => {
        if (!isIsoDateTimeRangeOrdered(value.from, value.to)) {
          ctx.addIssue({
            code: 'custom',
            message: 'sourceWindow.from must be <= sourceWindow.to',
            path: ['from'],
          });
        }
      }),
    sampleSize: nonNegativeInt,
    overallScore: score100,
    confidence,
    exploreRate: z.number().min(0).max(1),
    preferred: z.array(strategyPatternSchema),
    avoid: z.array(strategyPatternSchema),
    featureStats: strategyFeatureStatsSchema.optional(),
    hardConstraintsDigest: nonEmptyString.optional(),
    inputsDigest: nonEmptyString,
    status: z.enum(['active', 'insufficient-evidence', 'invalid-input']),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'insufficient-evidence') {
      if (value.sampleSize !== 0 || value.confidence !== 0 || value.preferred.length > 0 || value.avoid.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'insufficient-evidence strategies must have sampleSize 0, confidence 0, and empty preferred/avoid',
          path: ['status'],
        });
      }
      const hasFeatureStats = Object.values(value.featureStats ?? {}).some(
        (dimensionStats) => Object.keys(dimensionStats ?? {}).length > 0,
      );
      if (hasFeatureStats) {
        ctx.addIssue({
          code: 'custom',
          message: 'insufficient-evidence strategies must not carry non-empty featureStats',
          path: ['featureStats'],
        });
      }
    }
    if (value.status === 'active' && value.sampleSize < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'active strategies require sampleSize >= 1',
        path: ['sampleSize'],
      });
    }
  });

export type GrowthStrategySnapshot = z.infer<typeof growthStrategySnapshotSchema>;

export const humanPreferencePatternSchema = z.object({
  type: z.enum(['prefer', 'avoid', 'style']),
  dimension: z
    .union([growthFeatureDimensionSchema, z.enum(['language', 'tone', 'length', 'wording'])])
    .optional(),
  value: nonEmptyString,
  confidence,
  source: z.enum(['explicit', 'correction-inference']),
  rationale: nonEmptyString,
});

export type HumanPreferencePattern = z.infer<typeof humanPreferencePatternSchema>;

export const humanPreferenceSummarySchema = z
  .object({
    meta: envelopeMetaSchema,
    summaryId: nonEmptyString,
    subject: growthSubjectRefSchema,
    platform: platformSchema.optional(),
    generatedAt: isoDateTime,
    sourceCorrectionCount: nonNegativeInt,
    explicitFeedbackCount: nonNegativeInt,
    preferences: z.array(humanPreferencePatternSchema),
  })
  .superRefine((value, ctx) => {
    const hasExplicit = value.preferences.some((item) => item.source === 'explicit');
    const hasCorrection = value.preferences.some((item) => item.source === 'correction-inference');
    if (hasExplicit && value.explicitFeedbackCount < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'explicit preference patterns require explicitFeedbackCount >= 1',
        path: ['explicitFeedbackCount'],
      });
    }
    if (hasCorrection && value.sourceCorrectionCount < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'correction-inference preference patterns require sourceCorrectionCount >= 1',
        path: ['sourceCorrectionCount'],
      });
    }
  });

export type HumanPreferenceSummary = z.infer<typeof humanPreferenceSummarySchema>;

export const adviceItemSchema = z.object({
  dimension: growthFeatureDimensionSchema.optional(),
  text: nonEmptyString,
  priority: z.number().int(),
  evidence: z.string().optional(),
});

export type AdviceItem = z.infer<typeof adviceItemSchema>;

export const candidateAdviceSchema = z.object({
  meta: envelopeMetaSchema,
  adviceId: nonEmptyString,
  subject: growthSubjectRefSchema,
  platform: platformSchema,
  strategyId: nonEmptyString.optional(),
  goal: z.enum(['draft-generation', 'candidate-ranking', 'experiment']),
  softGuidance: z.array(adviceItemSchema),
  prohibitedGuidance: z.array(adviceItemSchema),
});

export type CandidateAdvice = z.infer<typeof candidateAdviceSchema>;
