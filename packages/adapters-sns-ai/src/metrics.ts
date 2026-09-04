import {
  isContractValidationError,
  parseMetricSnapshot,
  type MetricSnapshot,
} from '@sns-growth-bridge/contracts';

import { buildSnsAiEnvelope } from './envelope.js';
import {
  canonicalRawMetrics,
  isSnsAiPlatform,
  providerPostId,
  snsAiProviderPostIdentity,
  trimmedString,
} from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import type { SnsAiAdapterContext, SnsAiMetricSnapshotSource } from './source-types.js';

export function adaptSnsAiMetricSnapshot(
  source: SnsAiMetricSnapshotSource,
  context: SnsAiAdapterContext,
): AdapterResult<MetricSnapshot> {
  const accountId = trimmedString(source.account);
  if (!accountId) {
    return { status: 'blocked', reason: AdapterReason.missingAccountId };
  }

  const platform = trimmedString(source.platform);
  if (!isSnsAiPlatform(platform)) {
    return { status: 'blocked', reason: `${AdapterReason.unsupportedPlatform}: ${platform || '(empty)'}` };
  }

  const externalPostId = providerPostId(source.providerPostId);
  if (!externalPostId) {
    return { status: 'blocked', reason: AdapterReason.missingMetricPostId };
  }

  const capturedAt = trimmedString(source.collectedAt);
  const checkpointMinutes = source.checkpointMinutes;
  const postId = snsAiProviderPostIdentity(accountId, externalPostId);
  const snapshotId = `sns-ai:metric:${accountId}:${externalPostId}:${String(checkpointMinutes ?? '')}:${capturedAt}`;

  try {
    const value = parseMetricSnapshot({
      meta: buildSnsAiEnvelope(context),
      snapshotId,
      postId,
      subject: { accountId },
      platform,
      externalPostId,
      capturedAt,
      checkpointMinutes,
      metrics: canonicalRawMetrics(source.metrics),
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
