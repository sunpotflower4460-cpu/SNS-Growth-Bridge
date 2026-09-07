import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { platformSchema } from './platform.js';
import { isoDateTime, nonEmptyString } from './primitives.js';

/**
 * Explicit operator-confirmed mapping between one My-SNS social account and
 * one SNS-AI account. Never inferred from handle, displayName, or credentials.
 */
export const crossProductAccountLinkSchema = z.object({
  meta: envelopeMetaSchema,
  linkId: nonEmptyString,
  platform: platformSchema,
  mySns: z.object({
    workspaceId: nonEmptyString,
    socialAccountId: nonEmptyString,
  }),
  snsAi: z.object({
    accountId: nonEmptyString,
  }),
  status: z.enum(['active', 'disabled']),
  confirmation: z.literal('explicit-operator'),
  confirmedAt: isoDateTime,
});

export type CrossProductAccountLink = z.infer<typeof crossProductAccountLinkSchema>;
