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
  notPublished: 'not-published',
  missingProviderPostId: 'missing-provider-post-id',
  missingPlatform: 'missing-platform',
  unknownPlatform: 'unknown-platform',
  platformMismatch: 'platform-mismatch',
  invalidSourceIdentity: 'invalid-source-identity',
  invalidSourceDatetime: 'invalid-source-datetime',
  invalidCheckpoint: 'invalid-checkpoint',
  invalidMetric: 'invalid-metric',
  unknownFeedbackDimension: 'unknown-feedback-dimension',
  emptyFeedbackNote: 'empty-feedback-note',
  unknownFeedbackAction: 'unknown-feedback-action',
  crossAccount: 'cross-account',
  canonicalValidationFailed: 'canonical-validation-failed',
} as const;
