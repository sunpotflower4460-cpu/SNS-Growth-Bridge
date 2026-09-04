/**
 * Read-only My-SNS → Canonical adapters.
 *
 * Phase 5: BrandProfile, HumanCorrection, confirmed PublishedPost only.
 * No Supabase, MetricSnapshot, ExplicitFeedback, experiments, or strategy.
 * creatorId is never invented. socialAccountId is never mapped to accountId.
 */
export {
  PACKAGE_NAME,
  PACKAGE_PHASE,
  MY_SNS_AUDIT_SHA,
  MY_SNS_METRIC_SNAPSHOT_STATUS,
} from './version.js';
export { AdapterReason, type AdapterResult } from './result.js';
export type {
  MySnsAdapterContext,
  MySnsBrandProfileSource,
  MySnsDraftContentSource,
  MySnsDraftRevisionSource,
  MySnsPublishAttemptSource,
  MySnsPublishJobSource,
  MySnsPublishedPostInput,
} from './source-types.js';
export { normalizeMySnsDraftSnapshot, trimToUndefined } from './normalization.js';
export { adaptMySnsBrandProfile } from './brand-profile.js';
export { adaptMySnsDraftRevisionToHumanCorrection } from './correction.js';
export { adaptMySnsPublishedPost } from './published-post.js';
