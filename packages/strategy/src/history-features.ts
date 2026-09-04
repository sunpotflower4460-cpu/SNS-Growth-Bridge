import type { GrowthFeatureDimension } from '@sns-growth-bridge/contracts';

import { DEFAULT_TIMEZONE } from './config.js';
import type { StrategyPostEvidence } from './types.js';

/**
 * SNS-AI `historyFeatures`.
 * `publishedAt` is history `at`. `hasLegacyMediaUrl` is history `mediaUrl` truthiness.
 */
export function historyFeatures(
  entry: StrategyPostEvidence,
  timeZone = DEFAULT_TIMEZONE,
): Partial<Record<GrowthFeatureDimension, string>> {
  const features: Partial<Record<GrowthFeatureDimension, string>> = { ...entry.features };
  if (!features.mediaDecision) {
    features.mediaDecision = entry.hasLegacyMediaUrl ? 'library' : 'none';
  }
  if (entry.publishedAt) {
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(entry.publishedAt));
    features.postingHour = `${hour}:00`;
  }
  return features;
}
