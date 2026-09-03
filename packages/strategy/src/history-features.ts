import type { GrowthFeatureDimension } from '@sns-growth-bridge/contracts';

import type { StrategyPostEvidence } from './types.js';

/**
 * SNS-AI `historyFeatures` (`src/learning/features.mjs`).
 *
 * - `mediaDecision` fallback only fires when the entry has no feature already
 *   (`if (!features.mediaDecision)`), and falls back to `'library'` when the
 *   legacy entry had a `mediaUrl`, else `'none'`.
 * - `postingHour` is unconditionally (re)computed from `publishedAt` in the
 *   given IANA time zone whenever `publishedAt` is truthy, formatted as
 *   `"HH:00"` (24-hour, zero-padded) via `Intl.DateTimeFormat` `hourCycle: 'h23'`.
 */
export function historyFeatures(
  entry: StrategyPostEvidence,
  timeZone: string,
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
