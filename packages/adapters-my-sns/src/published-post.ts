import {
  isContractValidationError,
  parsePublishedPostSnapshot,
  type PublishedPostSnapshot,
} from '@sns-growth-bridge/contracts';

import { buildMySnsEnvelope } from './envelope.js';
import { isCanonicalPlatform } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import { blockedInvalidSourceIdentity, isNonEmptySourceId } from './source-identity.js';
import type {
  MySnsAdapterContext,
  MySnsPublishAttemptSource,
  MySnsPublishedPostInput,
} from './source-types.js';

function selectSuccessAttempt(
  jobId: string,
  workspaceId: string,
  attempts: readonly MySnsPublishAttemptSource[],
): { status: 'ok'; attempt: MySnsPublishAttemptSource } | { status: 'blocked'; reason: string } | { status: 'none' } {
  const forJob = attempts.filter((attempt) => attempt.publishJobId === jobId);
  if (forJob.some((attempt) => attempt.workspaceId !== workspaceId)) {
    return { status: 'blocked', reason: AdapterReason.crossWorkspace };
  }
  const successes = forJob.filter((attempt) => attempt.status === 'success');
  if (successes.length === 0) {
    return { status: 'none' };
  }
  const ranked = [...successes].sort((left, right) => {
    if (left.attemptNumber !== right.attemptNumber) {
      return right.attemptNumber - left.attemptNumber;
    }
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
  const selected = ranked[0];
  if (!selected) {
    return { status: 'none' };
  }
  return { status: 'ok', attempt: selected };
}

export function adaptMySnsPublishedPost(
  input: MySnsPublishedPostInput,
  context: MySnsAdapterContext,
): AdapterResult<PublishedPostSnapshot> {
  const { job, attempts, revision } = input;

  if (job.channel === 'line') {
    return { status: 'not-applicable', reason: AdapterReason.unsupportedChannel };
  }
  if (!isCanonicalPlatform(job.channel)) {
    return { status: 'blocked', reason: AdapterReason.unknownChannel };
  }
  if (job.status !== 'published') {
    return { status: 'not-applicable', reason: AdapterReason.jobNotPublished };
  }
  if (!isNonEmptySourceId(job.id)) {
    return blockedInvalidSourceIdentity('PublishJob.id');
  }
  if (!revision) {
    return { status: 'blocked', reason: AdapterReason.missingRevision };
  }
  if (revision.workspaceId !== job.workspaceId) {
    return { status: 'blocked', reason: AdapterReason.crossWorkspace };
  }
  if (
    revision.id !== job.revisionId ||
    revision.seedId !== job.seedId ||
    revision.socialDraftId !== job.draftId ||
    revision.channel !== job.channel
  ) {
    return { status: 'blocked', reason: AdapterReason.joinIntegrity };
  }

  const selected = selectSuccessAttempt(job.id, job.workspaceId, attempts);
  if (selected.status === 'blocked') {
    return selected;
  }
  if (selected.status === 'none') {
    return { status: 'not-applicable', reason: AdapterReason.noSuccessAttempt };
  }
  if (!job.publishedAt) {
    return { status: 'blocked', reason: AdapterReason.missingPublishedAt };
  }

  try {
    const value = parsePublishedPostSnapshot({
      meta: buildMySnsEnvelope(context),
      postId: `my-sns:publish-job:${job.id}`,
      subject: { workspaceId: job.workspaceId },
      platform: job.channel,
      revisionId: job.revisionId,
      seedId: job.seedId,
      externalPostId: selected.attempt.externalPostId,
      externalUrl: selected.attempt.externalUrl,
      publishedAt: job.publishedAt,
      text: revision.body,
      media: [],
      features: {},
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
