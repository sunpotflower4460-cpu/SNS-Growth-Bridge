import type { NormalizedMetricVector, RawMetricVector } from '@sns-growth-bridge/contracts';

import { clamp, safeRate, snsNumber } from './math.js';

export const METRIC_VECTOR_KEYS = [
  'exposure',
  'shareRate',
  'saveRate',
  'conversationRate',
  'profileRate',
  'clickRate',
  'followRate',
  'watchQuality',
] as const satisfies ReadonlyArray<keyof NormalizedMetricVector>;

/**
 * SNS-AI `metricVector`. Exposure is first-truthy
 * `impressions || reach || views || 0` (not max). likes is unused.
 */
export function metricVectorFromRaw(metrics: RawMetricVector = {}): NormalizedMetricVector {
  const exposure = snsNumber(metrics.impressions || metrics.reach || metrics.views || 0);
  const share = snsNumber(metrics.reposts || 0) + snsNumber(metrics.quotes || 0) + snsNumber(metrics.shares || 0);
  const saves = snsNumber(metrics.bookmarks || 0) + snsNumber(metrics.saved || 0);
  const conversation = snsNumber(metrics.replies || 0) + snsNumber(metrics.comments || 0);
  const profile = snsNumber(metrics.profileClicks || 0) + snsNumber(metrics.profileVisits || 0);
  const clicks = snsNumber(metrics.urlClicks || 0);
  const follows = snsNumber(metrics.follows || 0);
  const completion =
    snsNumber(metrics.videoViews || 0) > 0
      ? snsNumber(metrics.playback100 || 0) / snsNumber(metrics.videoViews || 1)
      : 0;
  const skipQuality =
    metrics.reelSkipRate != null ? 1 - clamp(snsNumber(metrics.reelSkipRate), 0, 1) : 0;
  return {
    exposure,
    shareRate: safeRate(share, exposure),
    saveRate: safeRate(saves, exposure),
    conversationRate: safeRate(conversation, exposure),
    profileRate: safeRate(profile, exposure),
    clickRate: safeRate(clicks, exposure),
    followRate: safeRate(follows, exposure),
    watchQuality: Math.max(completion, skipQuality),
  };
}
