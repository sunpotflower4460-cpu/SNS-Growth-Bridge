import { z } from 'zod';

import { CURRENT_SCHEMA_VERSION } from './schema-version.js';
import { isoDateTime, nonEmptyString } from './primitives.js';

export const producerSchema = z.enum(['my-sns', 'sns-ai', 'sns-growth-bridge']);

export type Producer = z.infer<typeof producerSchema>;

export const envelopeMetaSchema = z.object({
  schemaVersion: z
    .number()
    .int()
    .refine((value) => value === CURRENT_SCHEMA_VERSION, {
      message: `unsupported schema major; supported: ${String(CURRENT_SCHEMA_VERSION)}`,
    }),
  producer: producerSchema,
  producedAt: isoDateTime,
  traceId: nonEmptyString,
});

export type EnvelopeMeta = z.infer<typeof envelopeMetaSchema>;
