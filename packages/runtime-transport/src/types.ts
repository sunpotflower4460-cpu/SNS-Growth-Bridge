import type {
  ExplicitFeedbackEvent,
  MetricSnapshot,
  Platform,
  PublishedPostSnapshot,
} from '@sns-growth-bridge/contracts';
import type { StrategyPostEvidence } from '@sns-growth-bridge/strategy';

export interface SnsAiEvidencePaths {
  historyPath: string;
  metricsPath: string;
  feedbackPath: string;
}

export interface SnsAiEvidenceLoadInput {
  paths: SnsAiEvidencePaths;
  accountId: string;
  platform: Platform;
  sourceCommitSha: string;
  loadedAt: string;
  traceId: string;
  maxBytesPerFile?: number;
  maxRowsPerFile?: number;
}

export interface SnsAiEvidenceBundle {
  accountId: string;
  platform: Platform;
  source: {
    repository: 'sns-ai';
    commitSha: string;
  };
  loadedAt: string;
  publishedPosts: PublishedPostSnapshot[];
  metrics: MetricSnapshot[];
  feedback: ExplicitFeedbackEvent[];
  strategyPosts: StrategyPostEvidence[];
  counts: {
    historyRows: number;
    metricRows: number;
    feedbackRows: number;
  };
  digest: string;
}

export type TransportResult<T> =
  | { status: 'mapped'; value: T }
  | { status: 'blocked'; reason: string };

export const TransportReason = {
  emptyAccountId: 'empty-account-id',
  emptySourceCommitSha: 'empty-source-commit-sha',
  emptyLoadedAt: 'empty-loaded-at',
  invalidLoadedAt: 'invalid-loaded-at',
  invalidMaxBytesPerFile: 'invalid-max-bytes-per-file',
  invalidMaxRowsPerFile: 'invalid-max-rows-per-file',
  fileNotFound: 'file-not-found',
  fileTooLarge: 'file-too-large',
  rowLimitExceeded: 'row-limit-exceeded',
  malformedJsonl: 'malformed-jsonl',
  nonObjectRow: 'non-object-jsonl-row',
  platformMismatch: 'platform-mismatch',
  adapterBlocked: 'adapter-blocked',
  canonicalValidationFailed: 'canonical-validation-failed',
} as const;
