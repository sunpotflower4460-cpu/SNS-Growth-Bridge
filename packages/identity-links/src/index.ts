/**
 * Explicit My-SNS ↔ SNS-AI account links. No handle/credential inference.
 */
export { PACKAGE_NAME, PACKAGE_PHASE } from './version.js';
export {
  LinkReason,
  type LinkAdapterContext,
  type LinkedEvidenceBinding,
  type LinkedSubject,
  type LinkResult,
  type MySnsAccountDescriptor,
  type OperatorAccountLinkConfig,
  type SnsAiAccountDescriptor,
} from './types.js';
export { accountLinkId } from './link-id.js';
export { toCanonicalAccountLink, validateOperatorConfigIds } from './validate-link.js';
export { validateAccountLinkSet } from './validate-link-set.js';
export { bindActiveLinkToEvidence, linkedSubject, resolveActiveAccountLink } from './resolve-link.js';
