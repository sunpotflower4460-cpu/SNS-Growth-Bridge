import { z } from 'zod';

import { nonEmptyString } from './primitives.js';

/**
 * Source-neutral growth-domain identity.
 *
 * At least one of `creatorId`, `workspaceId`, `accountId` must be a non-empty
 * string. This package never infers `creatorId` from `Workspace.ownerId`,
 * `Seed.createdBy`, acting user, SNS-AI `accountId`, or a provider-native ID.
 */
export const growthSubjectRefSchema = z
  .object({
    creatorId: nonEmptyString.optional(),
    workspaceId: nonEmptyString.optional(),
    accountId: nonEmptyString.optional(),
  })
  .refine((value) => Boolean(value.creatorId ?? value.workspaceId ?? value.accountId), {
    message: 'GrowthSubjectRef requires at least one of creatorId, workspaceId, accountId',
  });

export type GrowthSubjectRef = z.infer<typeof growthSubjectRefSchema>;
