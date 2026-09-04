import {
  adaptSnsAiHistoryToPublishedPost,
  adaptSnsAiHistoryToStrategyPostEvidence,
  adaptSnsAiHumanFeedback,
  adaptSnsAiMetricSnapshot,
} from '@sns-growth-bridge/adapters-sns-ai';
import type { ExplicitFeedbackEvent, MetricSnapshot, PublishedPostSnapshot } from '@sns-growth-bridge/contracts';
import type { StrategyPostEvidence } from '@sns-growth-bridge/strategy';

import { isIsoDateTimeWithOffset } from './datetime.js';
import { canonicalDigest } from './digest.js';
import { readJsonlObjects } from './jsonl.js';
import { resolvePositiveIntLimit } from './limits.js';
import {
  TransportReason,
  type SnsAiEvidenceBundle,
  type SnsAiEvidenceLoadInput,
  type TransportResult,
} from './types.js';
import { DEFAULT_MAX_BYTES_PER_FILE, DEFAULT_MAX_ROWS_PER_FILE } from './version.js';

function trimId(value: string): string {
  return value.trim();
}

function rowAccount(row: Record<string, unknown>): string {
  return typeof row['account'] === 'string' ? row['account'].trim() : '';
}

function rowPlatform(row: Record<string, unknown>): string | undefined {
  return typeof row['platform'] === 'string' ? row['platform'].trim() : undefined;
}

function compareString(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function loadSnsAiEvidenceBundle(
  input: SnsAiEvidenceLoadInput,
): Promise<TransportResult<SnsAiEvidenceBundle>> {
  const accountId = trimId(input.accountId);
  if (!accountId) {
    return { status: 'blocked', reason: TransportReason.emptyAccountId };
  }
  const sourceCommitSha = trimId(input.sourceCommitSha);
  if (!sourceCommitSha) {
    return { status: 'blocked', reason: TransportReason.emptySourceCommitSha };
  }
  const loadedAt = trimId(input.loadedAt);
  if (!loadedAt) {
    return { status: 'blocked', reason: TransportReason.emptyLoadedAt };
  }
  if (!isIsoDateTimeWithOffset(loadedAt)) {
    return { status: 'blocked', reason: TransportReason.invalidLoadedAt };
  }
  const maxBytes = resolvePositiveIntLimit(
    input.maxBytesPerFile,
    DEFAULT_MAX_BYTES_PER_FILE,
    TransportReason.invalidMaxBytesPerFile,
  );
  if (maxBytes.status !== 'mapped') {
    return maxBytes;
  }
  const maxRows = resolvePositiveIntLimit(
    input.maxRowsPerFile,
    DEFAULT_MAX_ROWS_PER_FILE,
    TransportReason.invalidMaxRowsPerFile,
  );
  if (maxRows.status !== 'mapped') {
    return maxRows;
  }
  const limits = {
    maxBytes: maxBytes.value,
    maxRows: maxRows.value,
  };
  const context = { producedAt: loadedAt, traceId: input.traceId };

  const historyFile = await readJsonlObjects(input.paths.historyPath, limits, 'history');
  if (historyFile.status !== 'mapped') {
    return historyFile;
  }
  const metricsFile = await readJsonlObjects(input.paths.metricsPath, limits, 'metrics');
  if (metricsFile.status !== 'mapped') {
    return metricsFile;
  }
  const feedbackFile = await readJsonlObjects(input.paths.feedbackPath, limits, 'feedback');
  if (feedbackFile.status !== 'mapped') {
    return feedbackFile;
  }

  const historyRows = historyFile.value.filter((row) => rowAccount(row) === accountId);
  const metricRows = metricsFile.value.filter((row) => rowAccount(row) === accountId);
  const feedbackRows = feedbackFile.value.filter((row) => rowAccount(row) === accountId);

  for (const row of [...historyRows, ...metricRows]) {
    const platform = rowPlatform(row);
    if (platform && platform !== input.platform) {
      return { status: 'blocked', reason: TransportReason.platformMismatch };
    }
  }

  const publishedPosts: PublishedPostSnapshot[] = [];
  const strategyPosts: StrategyPostEvidence[] = [];
  for (const row of historyRows) {
    const published = adaptSnsAiHistoryToPublishedPost(
      { row, platform: input.platform },
      context,
    );
    if (published.status === 'blocked') {
      return { status: 'blocked', reason: `${TransportReason.adapterBlocked}: ${published.reason}` };
    }
    if (published.status === 'mapped') {
      publishedPosts.push(published.value);
    }
    const evidence = adaptSnsAiHistoryToStrategyPostEvidence({
      row,
      accountId,
    });
    if (evidence.status === 'blocked') {
      return { status: 'blocked', reason: `${TransportReason.adapterBlocked}: ${evidence.reason}` };
    }
    if (evidence.status === 'mapped') {
      strategyPosts.push(evidence.value);
    }
  }

  const metrics: MetricSnapshot[] = [];
  for (const row of metricRows) {
    const mapped = adaptSnsAiMetricSnapshot({ row, platform: input.platform }, context);
    if (mapped.status === 'blocked') {
      return { status: 'blocked', reason: `${TransportReason.adapterBlocked}: ${mapped.reason}` };
    }
    if (mapped.status === 'mapped') {
      metrics.push(mapped.value);
    }
  }

  const feedback: ExplicitFeedbackEvent[] = [];
  for (const row of feedbackRows) {
    const mapped = adaptSnsAiHumanFeedback(row, context);
    if (mapped.status === 'blocked') {
      return { status: 'blocked', reason: `${TransportReason.adapterBlocked}: ${mapped.reason}` };
    }
    if (mapped.status === 'mapped') {
      feedback.push(mapped.value);
    }
  }

  publishedPosts.sort((left, right) => compareString(left.publishedAt, right.publishedAt) || compareString(left.postId, right.postId));
  metrics.sort((left, right) => compareString(left.capturedAt, right.capturedAt) || compareString(left.snapshotId, right.snapshotId));
  feedback.sort((left, right) => compareString(left.occurredAt, right.occurredAt) || compareString(left.eventId, right.eventId));
  strategyPosts.sort(
    (left, right) => compareString(left.publishedAt, right.publishedAt) || compareString(left.externalPostId, right.externalPostId),
  );

  const bundle: SnsAiEvidenceBundle = {
    accountId,
    platform: input.platform,
    source: { repository: 'sns-ai', commitSha: sourceCommitSha },
    loadedAt,
    publishedPosts,
    metrics,
    feedback,
    strategyPosts,
    counts: {
      historyRows: historyRows.length,
      metricRows: metricRows.length,
      feedbackRows: feedbackRows.length,
    },
    digest: '',
  };
  bundle.digest = canonicalDigest({
    accountId: bundle.accountId,
    platform: bundle.platform,
    source: bundle.source,
    loadedAt: bundle.loadedAt,
    publishedPosts: bundle.publishedPosts,
    metrics: bundle.metrics,
    feedback: bundle.feedback,
    strategyPosts: bundle.strategyPosts,
    counts: bundle.counts,
  });
  return { status: 'mapped', value: bundle };
}
