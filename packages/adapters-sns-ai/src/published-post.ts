import {
  isContractValidationError,
  parsePublishedPostSnapshot,
  type PublishedPostSnapshot,
} from '@sns-growth-bridge/contracts';

import { buildSnsAiEnvelope } from './envelope.js';
import {
  isSnsAiPlatform,
  normalizeHistoryFeatures,
  providerPostId,
  publishedMediaFromHistory,
  snsAiProviderPostIdentity,
  trimmedString,
} from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import type { SnsAiAdapterContext, SnsAiHistoryEntrySource } from './source-types.js';

function stableHistoryPostId(source: SnsAiHistoryEntrySource, accountId: string): string | null {
  const externalPostId = providerPostId(source.providerPostId);
  if (externalPostId) return snsAiProviderPostIdentity(accountId, externalPostId);

  const slotId = trimmedString(source.slotId);
  if (slotId) return `sns-ai:slot:${accountId}:${slotId}`;

  const textHash = trimmedString(source.textHash);
  const publishedAt = trimmedString(source.at);
  if (textHash && publishedAt) return `sns-ai:history:${accountId}:${publishedAt}:${textHash}`;

  return null;
}

export function adaptSnsAiHistoryToPublishedPost(
  source: SnsAiHistoryEntrySource,
  context: SnsAiAdapterContext,
): AdapterResult<PublishedPostSnapshot> {
  if (source.status !== 'published') {
    return { status: 'not-applicable', reason: AdapterReason.historyNotPublished };
  }

  const accountId = trimmedString(source.account);
  if (!accountId) {
    return { status: 'blocked', reason: AdapterReason.missingAccountId };
  }

  const platform = trimmedString(source.platform);
  if (!isSnsAiPlatform(platform)) {
    return { status: 'blocked', reason: `${AdapterReason.unsupportedPlatform}: ${platform || '(empty)'}` };
  }

  const publishedAt = trimmedString(source.at);
  if (!publishedAt) {
    return { status: 'blocked', reason: AdapterReason.missingPublishedAt };
  }

  const postId = stableHistoryPostId(source, accountId);
  if (!postId) {
    return { status: 'blocked', reason: AdapterReason.missingStablePostIdentity };
  }

  const features = normalizeHistoryFeatures(source.features);
  if (features.status === 'blocked') return features;

  const externalPostId = providerPostId(source.providerPostId) || undefined;

  try {
    const value = parsePublishedPostSnapshot({
      meta: buildSnsAiEnvelope(context),
      postId,
      subject: { accountId },
      platform,
      externalPostId,
      publishedAt,
      text: typeof source.text === 'string' ? source.text : undefined,
      media: publishedMediaFromHistory(source.mediaUrl, source.mediaType),
      features: features.value,
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
