export type AdapterResult<T> =
  | { status: 'mapped'; value: T }
  | { status: 'not-applicable'; reason: string }
  | { status: 'blocked'; reason: string };

export const AdapterReason = {
  historyNotPublished: 'history-not-published',
  missingAccountId: 'missing-account-id',
  unsupportedPlatform: 'unsupported-platform',
  missingPublishedAt: 'missing-published-at',
  missingStablePostIdentity: 'missing-stable-post-identity',
  malformedFeature: 'malformed-feature',
  missingMetricPostId: 'metric-missing-provider-post-id',
  unsupportedFeedbackAction: 'unsupported-feedback-action',
  unsupportedFeedbackDimension: 'unsupported-feedback-dimension',
  missingFeedbackNote: 'missing-feedback-note',
  strategyMissingAccountId: 'strategy-missing-account-id',
  strategyAccountMismatch: 'strategy-account-mismatch',
  strategyPlatformMismatch: 'strategy-platform-mismatch',
  strategyInvalidInput: 'strategy-invalid-input',
  strategyMissingFeatureStats: 'strategy-missing-feature-stats',
  runtimePolicyMismatch: 'runtime-policy-mismatch',
  canonicalValidationFailed: 'canonical-validation-failed',
} as const;
