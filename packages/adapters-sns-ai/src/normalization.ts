import type { GrowthFeatureDimension, Platform, RawMetricVector } from '@sns-growth-bridge/contracts';

import { AdapterReason, type AdapterResult } from './result.js';

const CANONICAL_PLATFORMS: readonly Platform[] = [
  'x',
  'instagram',
  'youtube',
  'tiktok',
  'threads',
  'facebook',
  'note',
  'website',
];

export const FEATURE_DIMENSIONS = [
  'topic',
  'angle',
  'hook',
  'emotion',
  'format',
  'cta',
  'mediaDecision',
  'postingHour',
] as const satisfies readonly GrowthFeatureDimension[];

const RAW_METRIC_KEYS = [
  'impressions',
  'reach',
  'views',
  'likes',
  'reposts',
  'quotes',
  'shares',
  'bookmarks',
  'saved',
  'replies',
  'comments',
  'profileClicks',
  'profileVisits',
  'urlClicks',
  'follows',
  'videoViews',
  'playback100',
  'reelSkipRate',
] as const satisfies ReadonlyArray<keyof RawMetricVector>;

export function isCanonicalPlatform(value: string): value is Platform {
  return (CANONICAL_PLATFORMS as readonly string[]).includes(value);
}

/**
 * Use explicit row.platform and/or caller.platform. Never infer from accountId
 * or providerPostId shape.
 */
export function resolvePlatform(
  rowPlatform: string | undefined,
  callerPlatform: Platform | undefined,
): AdapterResult<Platform> {
  const fromRow = rowPlatform?.trim();
  if (fromRow && callerPlatform && fromRow !== callerPlatform) {
    if (!isCanonicalPlatform(fromRow) || !isCanonicalPlatform(callerPlatform)) {
      return { status: 'blocked', reason: AdapterReason.unknownPlatform };
    }
    return { status: 'blocked', reason: AdapterReason.platformMismatch };
  }
  const chosen = fromRow || callerPlatform;
  if (!chosen) {
    return { status: 'blocked', reason: AdapterReason.missingPlatform };
  }
  if (!isCanonicalPlatform(chosen)) {
    return { status: 'blocked', reason: AdapterReason.unknownPlatform };
  }
  return { status: 'mapped', value: chosen };
}

export function pickKnownFeatures(
  source: Record<string, unknown> | undefined,
): Partial<Record<GrowthFeatureDimension, string>> {
  const features: Partial<Record<GrowthFeatureDimension, string>> = {};
  if (!source) {
    return features;
  }
  for (const key of FEATURE_DIMENSIONS) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      features[key] = value.trim();
    }
  }
  return features;
}

export function mapRawMetrics(source: Record<string, unknown> | undefined): AdapterResult<RawMetricVector> {
  const metrics: RawMetricVector = {};
  if (!source) {
    return { status: 'mapped', value: metrics };
  }
  for (const key of RAW_METRIC_KEYS) {
    if (!(key in source) || source[key] === undefined || source[key] === null) {
      continue;
    }
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return { status: 'blocked', reason: `${AdapterReason.invalidMetric}: ${key}` };
    }
    if (key === 'reelSkipRate' && value > 1) {
      return { status: 'blocked', reason: `${AdapterReason.invalidMetric}: reelSkipRate` };
    }
    metrics[key] = value;
  }
  return { status: 'mapped', value: metrics };
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
