export type AdapterResult<T> =
  | {
      status: 'mapped';
      value: T;
    }
  | {
      status: 'not-applicable';
      reason: string;
    }
  | {
      status: 'blocked';
      reason: string;
    };

export const AdapterReason = {
  templateRevision: 'template-revision',
  missingAiOriginalSnapshot: 'missing-ai-original-snapshot',
  uneditedApproval: 'unedited-approval',
  unsupportedChannel: 'unsupported-channel',
  unknownChannel: 'unknown-channel',
  jobNotPublished: 'job-not-published',
  noSuccessAttempt: 'no-success-attempt',
  missingRevision: 'missing-revision',
  joinIntegrity: 'join-integrity',
  crossWorkspace: 'cross-workspace',
  missingPublishedAt: 'missing-published-at',
  canonicalValidationFailed: 'canonical-validation-failed',
  metricSnapshotUnavailable: 'my-sns-has-no-durable-metric-snapshots',
} as const;
