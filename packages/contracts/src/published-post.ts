import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { experimentAssignmentSchema } from './experiments.js';
import { growthSubjectRefSchema } from './identity.js';
import { growthFeatureDimensionSchema, platformSchema } from './platform.js';
import { publishedMediaSnapshotSchema } from './profile.js';
import { isoDateTime, nonEmptyString } from './primitives.js';

export const publishedPostSnapshotSchema = z.object({
  meta: envelopeMetaSchema,
  postId: nonEmptyString,
  subject: growthSubjectRefSchema,
  platform: platformSchema,
  revisionId: nonEmptyString.optional(),
  seedId: nonEmptyString.optional(),
  /**
   * Provider-native post id. Optional so My-SNS manual / zero-cost publishes
   * can be canonical PublishedPosts before a provider id exists.
   * MetricSnapshot.externalPostId remains required.
   */
  externalPostId: nonEmptyString.optional(),
  externalUrl: nonEmptyString.optional(),
  publishedAt: isoDateTime,
  text: z.string().optional(),
  media: z.array(publishedMediaSnapshotSchema),
  features: z.partialRecord(growthFeatureDimensionSchema, nonEmptyString),
  experimentAssignment: experimentAssignmentSchema.optional(),
});

export type PublishedPostSnapshot = z.infer<typeof publishedPostSnapshotSchema>;
