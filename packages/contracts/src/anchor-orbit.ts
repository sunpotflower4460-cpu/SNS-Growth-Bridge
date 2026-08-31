import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { platformSchema } from './platform.js';
import { confidence, isoDateTime, nonEmptyString } from './primitives.js';

export const humanAnchorSourceSchema = z.enum(['my-sns-manual', 'my-sns-approved', 'external-confirmed']);

export type HumanAnchorSource = z.infer<typeof humanAnchorSourceSchema>;

export const anchorEntitySchema = z.object({
  type: z.enum(['song', 'project', 'product', 'person', 'event', 'topic']),
  value: nonEmptyString,
});

export type AnchorEntity = z.infer<typeof anchorEntitySchema>;

export const humanAnchorEventSchema = z.object({
  meta: envelopeMetaSchema,
  anchorId: nonEmptyString,
  subject: growthSubjectRefSchema,
  platform: platformSchema,
  source: humanAnchorSourceSchema,
  publishedPostId: nonEmptyString.optional(),
  externalPostId: nonEmptyString.optional(),
  occurredAt: isoDateTime,
  theme: nonEmptyString.optional(),
  entities: z.array(anchorEntitySchema).optional(),
  summary: z.string().optional(),
  confidence,
});

export type HumanAnchorEvent = z.infer<typeof humanAnchorEventSchema>;

export const orbitItemTypeSchema = z.enum([
  'supporting_post',
  'alternate_asset',
  'story_context',
  'lyric_context',
  'behind_the_scenes',
  'cross_platform_echo',
]);

export type OrbitItemType = z.infer<typeof orbitItemTypeSchema>;

export const orbitItemSchema = z.object({
  orbitItemId: nonEmptyString,
  type: orbitItemTypeSchema,
  platform: platformSchema.optional(),
  timing: z.enum(['same_day', 'within_24h', 'within_72h', 'later']),
  concept: nonEmptyString,
  rationale: z.string().optional(),
  requiresApproval: z.boolean(),
});

export type OrbitItem = z.infer<typeof orbitItemSchema>;

export const scheduleAdjustmentActionSchema = z.enum(['keep', 'delay', 'cancel', 'replace']);

export type ScheduleAdjustmentAction = z.infer<typeof scheduleAdjustmentActionSchema>;

export const scheduleAdjustmentRecommendationSchema = z.object({
  adjustmentId: nonEmptyString,
  action: scheduleAdjustmentActionSchema,
  targetScheduleId: nonEmptyString.optional(),
  reason: nonEmptyString,
  replacementConcept: z.string().optional(),
  confidence,
});

export type ScheduleAdjustmentRecommendation = z.infer<typeof scheduleAdjustmentRecommendationSchema>;

export const orbitPlanSchema = z.object({
  meta: envelopeMetaSchema,
  orbitPlanId: nonEmptyString,
  subject: growthSubjectRefSchema,
  anchorId: nonEmptyString,
  generatedAt: isoDateTime,
  objective: nonEmptyString,
  confidence,
  orbitItems: z.array(orbitItemSchema).min(1),
  scheduleAdjustments: z.array(scheduleAdjustmentRecommendationSchema).optional(),
  relatedStrategyId: nonEmptyString.optional(),
});

export type OrbitPlan = z.infer<typeof orbitPlanSchema>;
