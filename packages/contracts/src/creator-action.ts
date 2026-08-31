import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import {
  confidence,
  isoDateTime,
  isIsoDateTimeRangeOrdered,
  nonEmptyString,
  nonNegativeFinite,
  nonNegativeInt,
  positiveInt,
} from './primitives.js';

export const creatorActionTypeSchema = z.enum([
  'asset_request',
  'capture_request',
  'profile_update',
  'information_request',
]);

export type CreatorActionType = z.infer<typeof creatorActionTypeSchema>;

export const mediaTypeSchema = z.enum(['video', 'image', 'audio', 'text']);

export type MediaType = z.infer<typeof mediaTypeSchema>;

export const orientationSchema = z.enum(['vertical', 'horizontal', 'square']);

export type Orientation = z.infer<typeof orientationSchema>;

export const framingSchema = z.enum(['wide', 'medium', 'close', 'detail', 'overhead', 'pov']);

export type Framing = z.infer<typeof framingSchema>;

export const durationSecondsSchema = z
  .object({
    min: nonNegativeFinite.optional(),
    max: nonNegativeFinite.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'durationSeconds.min must be <= durationSeconds.max',
        path: ['min'],
      });
    }
  });

export type DurationSeconds = z.infer<typeof durationSecondsSchema>;

export const assetRequestSchema = z.object({
  kind: z.literal('asset_request'),
  songOrSubject: nonEmptyString.optional(),
  mediaType: mediaTypeSchema,
  orientation: orientationSchema.optional(),
  durationSeconds: durationSecondsSchema.optional(),
  framing: z.array(framingSchema).optional(),
  quantity: positiveInt.optional(),
  desiredMoments: z.array(nonEmptyString).optional(),
  notes: z.array(z.string()).optional(),
});

export type AssetRequest = z.infer<typeof assetRequestSchema>;

export const captureRequestSchema = z.object({
  kind: z.literal('capture_request'),
  songOrSubject: nonEmptyString.optional(),
  notes: z.array(z.string()).optional(),
});

export type CaptureRequest = z.infer<typeof captureRequestSchema>;

export const profileUpdateRequestSchema = z.object({
  kind: z.literal('profile_update'),
  fields: z.array(nonEmptyString).min(1),
  notes: z.array(z.string()).optional(),
});

export type ProfileUpdateRequest = z.infer<typeof profileUpdateRequestSchema>;

export const informationRequestSchema = z.object({
  kind: z.literal('information_request'),
  questions: z.array(nonEmptyString).min(1),
  notes: z.array(z.string()).optional(),
});

export type InformationRequest = z.infer<typeof informationRequestSchema>;

export const creatorRequestedActionSchema = z.discriminatedUnion('kind', [
  assetRequestSchema,
  captureRequestSchema,
  profileUpdateRequestSchema,
  informationRequestSchema,
]);

export type CreatorRequestedAction = z.infer<typeof creatorRequestedActionSchema>;

export const recommendationRationaleSchema = z.object({
  summary: nonEmptyString,
  evidenceCount: nonNegativeInt,
  evidenceWindow: z
    .object({
      from: isoDateTime,
      to: isoDateTime,
    })
    .superRefine((value, ctx) => {
      if (!isIsoDateTimeRangeOrdered(value.from, value.to)) {
        ctx.addIssue({
          code: 'custom',
          message: 'evidenceWindow.from must be <= evidenceWindow.to',
          path: ['from'],
        });
      }
    })
    .optional(),
  observations: z.array(z.string()),
  missingEvidence: z.array(z.string()).optional(),
});

export type RecommendationRationale = z.infer<typeof recommendationRationaleSchema>;

export const creatorActionRecommendationSchema = z
  .object({
    meta: envelopeMetaSchema,
    recommendationId: nonEmptyString,
    subject: growthSubjectRefSchema,
    type: creatorActionTypeSchema,
    objective: nonEmptyString,
    priority: z.enum(['low', 'normal', 'high']),
    confidence,
    generatedAt: isoDateTime,
    expiresAt: isoDateTime.optional(),
    rationale: recommendationRationaleSchema,
    requestedAction: creatorRequestedActionSchema,
    relatedStrategyId: nonEmptyString.optional(),
    relatedPostIds: z.array(nonEmptyString),
  })
  .superRefine((value, ctx) => {
    if (value.type !== value.requestedAction.kind) {
      ctx.addIssue({
        code: 'custom',
        message: 'requestedAction.kind must match recommendation.type',
        path: ['requestedAction', 'kind'],
      });
    }
    if (value.confidence >= 0.8 && value.rationale.evidenceCount === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'high confidence is not allowed when evidenceCount is 0',
        path: ['confidence'],
      });
    }
    if (value.expiresAt !== undefined && !isIsoDateTimeRangeOrdered(value.generatedAt, value.expiresAt)) {
      ctx.addIssue({
        code: 'custom',
        message: 'expiresAt must be >= generatedAt',
        path: ['expiresAt'],
      });
    }
  });

export type CreatorActionRecommendation = z.infer<typeof creatorActionRecommendationSchema>;
