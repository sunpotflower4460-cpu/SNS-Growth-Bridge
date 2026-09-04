import { createHash } from 'node:crypto';

import {
  isContractValidationError,
  parseExplicitFeedbackEvent,
  type ExplicitFeedbackEvent,
  type GrowthFeatureDimension,
} from '@sns-growth-bridge/contracts';

import { buildSnsAiEnvelope } from './envelope.js';
import { isGrowthFeatureDimension, trimmedString } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import type { SnsAiAdapterContext, SnsAiHumanFeedbackSource } from './source-types.js';

const FEEDBACK_ACTIONS = new Set(['prefer', 'avoid', 'correct', 'pin', 'note']);

function feedbackEventId(input: {
  at: string;
  accountId: string;
  action: string;
  note: string;
  dimension?: GrowthFeatureDimension;
  value?: string;
}): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([input.at, input.accountId, input.action, input.note, input.dimension ?? '', input.value ?? '']))
    .digest('hex')
    .slice(0, 24);
  return `sns-ai:feedback:${digest}`;
}

export function adaptSnsAiHumanFeedback(
  source: SnsAiHumanFeedbackSource,
  context: SnsAiAdapterContext,
): AdapterResult<ExplicitFeedbackEvent> {
  const accountId = trimmedString(source.account);
  if (!accountId) {
    return { status: 'blocked', reason: AdapterReason.missingAccountId };
  }

  const action = trimmedString(source.action || 'note').toLowerCase();
  if (!FEEDBACK_ACTIONS.has(action)) {
    return { status: 'blocked', reason: `${AdapterReason.unsupportedFeedbackAction}: ${action || '(empty)'}` };
  }

  const note = trimmedString(source.note);
  if (!note) {
    return { status: 'blocked', reason: AdapterReason.missingFeedbackNote };
  }

  let dimension: GrowthFeatureDimension | undefined;
  if (source.dimension != null) {
    const rawDimension = trimmedString(source.dimension);
    if (rawDimension) {
      if (!isGrowthFeatureDimension(rawDimension)) {
        return {
          status: 'blocked',
          reason: `${AdapterReason.unsupportedFeedbackDimension}: ${rawDimension}`,
        };
      }
      dimension = rawDimension;
    }
  }

  const rawValue = source.value == null ? '' : trimmedString(source.value);
  const value = rawValue || undefined;
  const occurredAt = trimmedString(source.at);

  try {
    const event = {
      meta: buildSnsAiEnvelope(context),
      eventId: feedbackEventId({ occurredAt, at: occurredAt, accountId, action, note, dimension, value } as never),
      subject: { accountId },
      action,
      dimension,
      value,
      note,
      active: source.active !== false,
      occurredAt,
    };
    const parsed = parseExplicitFeedbackEvent(event);
    return { status: 'mapped', value: parsed };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
