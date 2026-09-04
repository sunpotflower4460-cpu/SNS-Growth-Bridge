import type { DraftContentSnapshot, Platform } from '@sns-growth-bridge/contracts';

import type { MySnsDraftContentSource } from './source-types.js';

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

/** My-SNS `trimToUndefined` from `draft-style-learning.ts`. */
export function trimToUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * My-SNS `freezeAiOriginalSnapshot` / `snapshotFromRevision`.
 * Title and CTA are trimmed; body is exact; hashtags are copied without dedupe.
 */
export function normalizeMySnsDraftSnapshot(input: MySnsDraftContentSource): DraftContentSnapshot {
  return {
    title: trimToUndefined(input.title),
    body: input.body,
    hashtags: [...(input.hashtags ?? [])],
    cta: trimToUndefined(input.cta),
  };
}

export function isCanonicalPlatform(channel: string): channel is Platform {
  return (CANONICAL_PLATFORMS as readonly string[]).includes(channel);
}

export function copyStringArray(values: readonly string[]): string[] {
  return [...values];
}
