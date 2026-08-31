import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { growthFeatureDimensionSchema } from './platform.js';
import { isoDateTime, nonEmptyString } from './primitives.js';

export const explicitFeedbackEventSchema = z.object({
  meta: envelopeMetaSchema,
  eventId: nonEmptyString,
  subject: growthSubjectRefSchema,
  action: z.enum(['prefer', 'avoid', 'correct', 'pin', 'note']),
  dimension: growthFeatureDimensionSchema.optional(),
  value: nonEmptyString.optional(),
  note: nonEmptyString,
  active: z.boolean(),
  occurredAt: isoDateTime,
});

export type ExplicitFeedbackEvent = z.infer<typeof explicitFeedbackEventSchema>;
