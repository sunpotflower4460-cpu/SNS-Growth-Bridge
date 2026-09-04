import {
  deriveChangedFields,
  isContractValidationError,
  parseHumanCorrectionEvent,
  type HumanCorrectionEvent,
} from '@sns-growth-bridge/contracts';

import { buildMySnsEnvelope } from './envelope.js';
import { isCanonicalPlatform, normalizeMySnsDraftSnapshot } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import type { MySnsAdapterContext, MySnsDraftRevisionSource } from './source-types.js';

export function adaptMySnsDraftRevisionToHumanCorrection(
  revision: MySnsDraftRevisionSource,
  context: MySnsAdapterContext,
): AdapterResult<HumanCorrectionEvent> {
  if (revision.source !== 'ai') {
    return { status: 'not-applicable', reason: AdapterReason.templateRevision };
  }
  if (!revision.aiOriginalSnapshot) {
    return { status: 'not-applicable', reason: AdapterReason.missingAiOriginalSnapshot };
  }
  if (revision.channel === 'line') {
    return { status: 'not-applicable', reason: AdapterReason.unsupportedChannel };
  }
  if (!isCanonicalPlatform(revision.channel)) {
    return { status: 'blocked', reason: AdapterReason.unknownChannel };
  }

  const before = normalizeMySnsDraftSnapshot(revision.aiOriginalSnapshot);
  const after = normalizeMySnsDraftSnapshot({
    title: revision.title,
    body: revision.body,
    hashtags: revision.hashtags,
    cta: revision.cta,
  });
  const changedFields = deriveChangedFields(before, after);
  if (changedFields.length === 0) {
    return { status: 'not-applicable', reason: AdapterReason.uneditedApproval };
  }

  try {
    const value = parseHumanCorrectionEvent({
      meta: buildMySnsEnvelope(context),
      eventId: `my-sns:human-correction:${revision.id}`,
      subject: { workspaceId: revision.workspaceId },
      platform: revision.channel,
      seedId: revision.seedId,
      draftId: revision.socialDraftId,
      revisionId: revision.id,
      aiGenerationId: revision.aiGenerationId,
      occurredAt: revision.createdAt,
      before,
      after,
      changedFields,
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
