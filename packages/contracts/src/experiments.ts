import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { growthFeatureDimensionSchema, platformSchema } from './platform.js';
import { confidence, isoDateTime, nonEmptyString, score100 } from './primitives.js';

export const experimentAssignmentSchema = z.object({
  experimentId: nonEmptyString,
  dimension: growthFeatureDimensionSchema,
  variant: nonEmptyString,
});

export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>;

export const experimentDefinitionSchema = z
  .object({
    meta: envelopeMetaSchema,
    experimentId: nonEmptyString,
    subject: growthSubjectRefSchema,
    platform: platformSchema,
    dimension: growthFeatureDimensionSchema,
    control: nonEmptyString,
    variant: nonEmptyString,
    startedAt: isoDateTime,
    status: z.enum(['planned', 'running', 'completed', 'cancelled']),
  })
  .superRefine((value, ctx) => {
    if (value.control === value.variant) {
      ctx.addIssue({
        code: 'custom',
        message: 'ExperimentDefinition control and variant must differ',
        path: ['variant'],
      });
    }
  });

export type ExperimentDefinition = z.infer<typeof experimentDefinitionSchema>;

export const experimentResultSchema = z.object({
  meta: envelopeMetaSchema,
  experimentId: nonEmptyString,
  completedAt: isoDateTime,
  controlScore: score100.optional(),
  variantScore: score100.optional(),
  confidence,
  outcome: z.enum(['control', 'variant', 'inconclusive']),
  notes: z.array(z.string()),
});

export type ExperimentResult = z.infer<typeof experimentResultSchema>;
