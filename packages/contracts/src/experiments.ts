import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { growthFeatureDimensionSchema, platformSchema } from './platform.js';
import { confidence, isoDateTime, nonEmptyString } from './primitives.js';

export const experimentAssignmentSchema = z.object({
  experimentId: nonEmptyString,
  dimension: growthFeatureDimensionSchema,
  variant: nonEmptyString,
});

export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>;

export const experimentDefinitionSchema = z.object({
  meta: envelopeMetaSchema,
  experimentId: nonEmptyString,
  subject: growthSubjectRefSchema,
  platform: platformSchema,
  dimension: growthFeatureDimensionSchema,
  control: nonEmptyString,
  variant: nonEmptyString,
  startedAt: isoDateTime,
  status: z.enum(['planned', 'running', 'completed', 'cancelled']),
});

export type ExperimentDefinition = z.infer<typeof experimentDefinitionSchema>;

export const experimentResultSchema = z.object({
  meta: envelopeMetaSchema,
  experimentId: nonEmptyString,
  completedAt: isoDateTime,
  controlScore: z.number().optional(),
  variantScore: z.number().optional(),
  confidence,
  outcome: z.enum(['control', 'variant', 'inconclusive']),
  notes: z.array(z.string()),
});

export type ExperimentResult = z.infer<typeof experimentResultSchema>;
