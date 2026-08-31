import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { platformSchema } from './platform.js';
import { nonEmptyString } from './primitives.js';

export const creatorHardRuleSchema = z.object({
  id: nonEmptyString,
  type: z.enum(['prefer', 'avoid', 'must', 'never']),
  scope: z.union([z.literal('all'), platformSchema]),
  text: nonEmptyString,
  source: z.enum(['brand-profile', 'explicit-feedback', 'operator']),
  pinned: z.boolean(),
});

export type CreatorHardRule = z.infer<typeof creatorHardRuleSchema>;

export const creatorProfileSnapshotSchema = z.object({
  meta: envelopeMetaSchema,
  subject: growthSubjectRefSchema,
  profileVersion: nonEmptyString,
  name: z.string().optional(),
  audience: z.string().optional(),
  language: z.string().optional(),
  voiceTraits: z.array(z.string()),
  values: z.array(z.string()),
  preferredTerms: z.array(z.string()),
  avoidedTerms: z.array(z.string()),
  defaultCallToAction: z.string().optional(),
  hardRules: z.array(creatorHardRuleSchema),
});

export type CreatorProfileSnapshot = z.infer<typeof creatorProfileSnapshotSchema>;

export const publishedMediaSnapshotSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'document', 'none']),
  role: z.enum(['source', 'variant', 'thumbnail', 'cover', 'eyecatch']).optional(),
});

export type PublishedMediaSnapshot = z.infer<typeof publishedMediaSnapshotSchema>;
