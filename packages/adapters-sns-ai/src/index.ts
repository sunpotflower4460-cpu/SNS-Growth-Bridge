/**
 * Read-only SNS-AI → Canonical adapters.
 *
 * Phase 6: history, metrics, explicit feedback, and Phase 4 strategy input.
 * No JSONL transport, provider calls, Artist Support mapping, or autonomy.
 * account → subject.accountId only. creatorId / workspaceId are never invented.
 */
export {
  PACKAGE_NAME,
  PACKAGE_PHASE,
  SNS_AI_AUDIT_SHA,
  SNS_AI_METRIC_SNAPSHOT_STATUS,
} from './version.js';
export { AdapterReason, type AdapterResult } from './result.js';
export type {
  SnsAiAdapterContext,
  SnsAiFeedbackSource,
  SnsAiHistoryAdapterInput,
  SnsAiHistorySource,
  SnsAiMetricAdapterInput,
  SnsAiMetricSource,
} from './source-types.js';
export { SNS_AI_RUNTIME_POLICY_INVARIANTS } from './runtime-policy.js';
export { adaptSnsAiHistoryToPublishedPost } from './history.js';
export { adaptSnsAiMetricSnapshot } from './metric.js';
export { adaptSnsAiHumanFeedback, feedbackEventId } from './feedback.js';
export {
  adaptSnsAiHistoryToStrategyPostEvidence,
  adaptSnsAiHistoryRowsToStrategyPostEvidence,
} from './strategy-input.js';
