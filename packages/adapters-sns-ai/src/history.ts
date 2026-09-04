import {
  isContractValidationError,
  parsePublishedPostSnapshot,
  type PublishedPostSnapshot,
} from '@sns-growth-bridge/contracts';

import { buildSnsAiEnvelope } from './envelope.js';
import { pickKnownFeatures, resolvePlatform } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import {
  blockedInvalidSourceDatetime,
  isIsoDateTimeSource,
  isNonEmptySourceId,
  requireAccountId,
  sourceIdText,
} from './source-identity.js';
import type { SnsAiAdapterContext, SnsAiHistoryAdapterInput } from './source-types.js';

export function adaptSnsAiHistoryToPublishedPost(
  input: SnsAiHistoryAdapterInput,
  context: SnsAiAdapterContext,
): AdapterResult<PublishedPostSnapshot> {
  const { row } = input;
  const account = requireAccountId(row.account);
  if (account.status !== 'mapped') {
    return account;
  }
  if (row.status !== 'published') {
    return { status: 'not-applicable', reason: AdapterReason.notPublished };
  }
  const providerPostId = sourceIdText(row.providerPostId);
  if (providerPostId === undefined || !isNonEmptySourceId(providerPostId)) {
    return { status: 'not-applicable', reason: AdapterReason.missingProviderPostId };
  }
  const externalPostId = providerPostId.trim();
  if (!row.at) {
    return blockedInvalidSourceDatetime('at');
  }
  if (!isIsoDateTimeSource(row.at)) {
    return blockedInvalidSourceDatetime('at');
  }
  const platform = resolvePlatform(row.platform, input.platform);
  if (platform.status !== 'mapped') {
    return platform;
  }

  try {
    const value = parsePublishedPostSnapshot({
      meta: buildSnsAiEnvelope(context),
      postId: `sns-ai:${account.value}:${externalPostId}`,
      subject: { accountId: account.value },
      platform: platform.value,
      externalPostId,
      publishedAt: row.at,
      text: row.text,
      media: [],
      features: pickKnownFeatures(row.features),
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
