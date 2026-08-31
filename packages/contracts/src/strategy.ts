import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { growthFeatureDimensionSchema, platformSchema } from './platform.js';
import { confidence, isoDateTime, nonEmptyString, nonNegativeInt, positiveInt } from './primitives.js';

export const strategyPatternSchema = z.object({
  dimension: growthFeatureDimensionSchema,
  value: nonEmptyString,
  sampleSize: nonNegativeInt,
  averageScore: z.number(),
  lift: z.number(),
  confidence,
  rationale: nonEmptyString,
  evidencePostIds: z.array(nonEmptyString),
});

export type StrategyPattern = z.infer<typeof strategyPatternSchema>;

export const growthStrategySnapshotSchema = z
  .object({
    meta: envelopeMetaSchema,
    strategyId: nonEmptyString,
    strategyVersion: nonEmptyString,
    subject: growthSubjectRefSchema,
    platform: platformSchema,
    generatedAt: isoDateTime,
    sourceWindow: z.object({
      from: isoDateTime,
      to: isoDateTime,
      strategyWindowDays: positiveInt,
      matureCheckpointMinutes: positiveInt,
    }),
    sampleSize: nonNegativeInt,
    overallScore: z.number(),
    confidence,
    exploreRate: z.number().min(0).max(1),
    preferred: z.array(strategyPatternSchema),
    avoid: z.array(strategyPatternSchema),
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

export const humanPreferenceSummarySchema = z.object({
  meta: envelopeMetaSchema,
  summaryId: nonEmptyString,
  subject: growthSubjectRefSchema,
  platform: platformSchema.optional(),
  generatedAt: isoDateTime,
  sourceCorrectionCount: nonNegativeInt,
  explicitFeedbackCount: nonNegativeInt,
  preferences: z.array(humanPreferencePatternSchema),
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
