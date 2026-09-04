import type {
  GrowthFeatureDimension,
  Platform,
  PublishedMediaSnapshot,
  RawMetricVector,
} from '@sns-growth-bridge/contracts';

import { AdapterReason } from './result.js';

export const SNS_AI_SUPPORTED_PLATFORMS = ['x', 'instagram'] as const satisfies readonly Platform[];

export const CANONICAL_FEATURE_DIMENSIONS = [
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
] as const satisfies readonly (keyof RawMetricVector)[];

export function trimmedString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

export function isSnsAiPlatform(value: string): value is (typeof SNS_AI_SUPPORTED_PLATFORMS)[number] {
  return (SNS_AI_SUPPORTED_PLATFORMS as readonly string[]).includes(value);
}

export function isGrowthFeatureDimension(value: string): value is GrowthFeatureDimension {
  return (CANONICAL_FEATURE_DIMENSIONS as readonly string[]).includes(value);
}

export function normalizeHistoryFeatures(
  source: Record<string, unknown> | null | undefined,
): { status: 'ok'; value: Partial<Record<GrowthFeatureDimension, string>> } | { status: 'blocked'; reason: string } {
  if (!source) return { status: 'ok', value: {} };
  const value: Partial<Record<GrowthFeatureDimension, string>> = {};
  for (const dimension of CANONICAL_FEATURE_DIMENSIONS) {
    const raw = source[dimension];
    if (raw == null || raw === '') continue;
    if (typeof raw !== 'string') {
      return { status: 'blocked', reason: `${AdapterReason.malformedFeature}: ${dimension}` };
    }
    const normalized = raw.trim();
    if (!normalized) {
      return { status: 'blocked', reason: `${AdapterReason.malformedFeature}: ${dimension}` };
    }
    value[dimension] = normalized;
  }
  return { status: 'ok', value };
}

/**
 * SNS-AI stores mediaUrl and mediaType in history. The URL itself is deliberately
 * not exported; only proven media presence plus a coarse public-safe type is kept.
 * `mediaType` without `mediaUrl` is not evidence of published media because X text
 * posts can carry the default mediaType while having no media URL.
 */
export function publishedMediaFromHistory(mediaUrl: unknown, mediaType: unknown): PublishedMediaSnapshot[] {
  if (!trimmedString(mediaUrl)) return [];
  switch (trimmedString(mediaType).toLowerCase()) {
    case 'image':
      return [{ type: 'image' }];
    case 'video':
    case 'reel':
      return [{ type: 'video' }];
    case 'audio':
      return [{ type: 'audio' }];
    case 'document':
      return [{ type: 'document' }];
    default:
      return [];
  }
}

/** Preserve only fields represented by Canonical RawMetricVector. */
export function canonicalRawMetrics(source: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!source) return result;
  for (const key of RAW_METRIC_KEYS) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

export function providerPostId(value: unknown): string {
  return trimmedString(value);
}

export function snsAiProviderPostIdentity(accountId: string, externalPostId: string): string {
  return `sns-ai:provider-post:${accountId}:${externalPostId}`;
}
