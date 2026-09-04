import {
  isContractValidationError,
  parseMetricSnapshot,
  type MetricSnapshot,
} from '@sns-growth-bridge/contracts';

import { buildSnsAiEnvelope } from './envelope.js';
import { isPositiveInt, mapRawMetrics, resolvePlatform } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import {
  blockedInvalidSourceDatetime,
  isIsoDateTimeSource,
  isNonEmptySourceId,
  requireAccountId,
  sourceIdText,
} from './source-identity.js';
import type { SnsAiAdapterContext, SnsAiMetricAdapterInput } from './source-types.js';

export function adaptSnsAiMetricSnapshot(
  input: SnsAiMetricAdapterInput,
  context: SnsAiAdapterContext,
): AdapterResult<MetricSnapshot> {
  const { row } = input;
  const account = requireAccountId(row.account);
  if (account.status !== 'mapped') {
    return account;
  }
  const providerPostId = sourceIdText(row.providerPostId);
  if (providerPostId === undefined || !isNonEmptySourceId(providerPostId)) {
    return { status: 'blocked', reason: `${AdapterReason.invalidSourceIdentity}: providerPostId` };
  }
  const externalPostId = providerPostId.trim();
  if (!row.collectedAt || !isIsoDateTimeSource(row.collectedAt)) {
    return blockedInvalidSourceDatetime('collectedAt');
  }
  if (!isPositiveInt(row.checkpointMinutes)) {
    return { status: 'blocked', reason: AdapterReason.invalidCheckpoint };
  }
  const platform = resolvePlatform(row.platform, input.platform);
  if (platform.status !== 'mapped') {
    return platform;
  }
  const metrics = mapRawMetrics(row.metrics);
  if (metrics.status !== 'mapped') {
    return metrics;
  }

  const checkpointMinutes = row.checkpointMinutes;
  try {
    const value = parseMetricSnapshot({
      meta: buildSnsAiEnvelope(context),
      snapshotId: `sns-ai:metric:${account.value}:${externalPostId}:${String(checkpointMinutes)}:${row.collectedAt}`,
      postId: `sns-ai:${account.value}:${externalPostId}`,
      subject: { accountId: account.value },
      platform: platform.value,
      externalPostId,
      capturedAt: row.collectedAt,
      checkpointMinutes,
      metrics: metrics.value,
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
