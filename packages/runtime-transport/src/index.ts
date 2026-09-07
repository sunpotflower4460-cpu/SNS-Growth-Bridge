/**
 * Read-only SNS-AI JSONL evidence transport. No network, no writes, no path leakage.
 */
export { PACKAGE_NAME, PACKAGE_PHASE, DEFAULT_MAX_BYTES_PER_FILE, DEFAULT_MAX_ROWS_PER_FILE } from './version.js';
export {
  TransportReason,
  type SnsAiEvidenceBundle,
  type SnsAiEvidenceLoadInput,
  type SnsAiEvidencePaths,
  type TransportResult,
} from './types.js';
export { loadSnsAiEvidenceBundle } from './load-evidence.js';
export { buildLinkedShadowStrategy, likesDoNotAffectScore } from './linked-strategy.js';
