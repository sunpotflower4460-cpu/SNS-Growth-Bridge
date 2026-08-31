import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { platformSchema } from './platform.js';
import { confidence, isoDateTime, nonEmptyString, nonNegativeFinite, nonNegativeInt, positiveInt } from './primitives.js';

const countMetric = nonNegativeFinite;

const reelSkipRate = z.number().min(0).max(1);

/**
 * Raw provider metrics. `likes` is preservation-only: Phase 3 scoring must
 * ignore it to keep SNS-AI scorer parity.
 */
export const rawMetricVectorSchema = z.object({
  impressions: countMetric.optional(),
  reach: countMetric.optional(),
  views: countMetric.optional(),
  likes: countMetric.optional(),
  reposts: countMetric.optional(),
  quotes: countMetric.optional(),
  shares: countMetric.optional(),
  bookmarks: countMetric.optional(),
  saved: countMetric.optional(),
  replies: countMetric.optional(),
  comments: countMetric.optional(),
  profileClicks: countMetric.optional(),
  profileVisits: countMetric.optional(),
  urlClicks: countMetric.optional(),
  follows: countMetric.optional(),
  videoViews: countMetric.optional(),
  playback100: countMetric.optional(),
  reelSkipRate: reelSkipRate.optional(),
});

export type RawMetricVector = z.infer<typeof rawMetricVectorSchema>;

export const metricSnapshotSchema = z.object({
  meta: envelopeMetaSchema,
  snapshotId: nonEmptyString,
  postId: nonEmptyString,
  subject: growthSubjectRefSchema,
  platform: platformSchema,
  externalPostId: nonEmptyString,
  capturedAt: isoDateTime,
  checkpointMinutes: positiveInt,
  metrics: rawMetricVectorSchema,
});

export type MetricSnapshot = z.infer<typeof metricSnapshotSchema>;

export const normalizedMetricVectorSchema = z.object({
  exposure: nonNegativeFinite,
  shareRate: nonNegativeFinite,
  saveRate: nonNegativeFinite,
  conversationRate: nonNegativeFinite,
  profileRate: nonNegativeFinite,
  clickRate: nonNegativeFinite,
  followRate: nonNegativeFinite,
  watchQuality: z.number().min(0).max(1),
});

export type NormalizedMetricVector = z.infer<typeof normalizedMetricVectorSchema>;

export const performanceScoreSchema = z.object({
  postId: nonEmptyString,
  score: z.number().min(0).max(100),
  confidence,
  baselineCount: nonNegativeInt,
  vector: normalizedMetricVectorSchema,
  baseline: normalizedMetricVectorSchema,
  components: z.record(z.string(), z.number()),
});

export type PerformanceScore = z.infer<typeof performanceScoreSchema>;
