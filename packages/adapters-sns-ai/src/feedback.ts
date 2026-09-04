import { createHash } from 'node:crypto';

import {
  isContractValidationError,
  parseExplicitFeedbackEvent,
  type ExplicitFeedbackEvent,
} from '@sns-growth-bridge/contracts';

import { buildSnsAiEnvelope } from './envelope.js';
import { FEATURE_DIMENSIONS } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import {
  blockedInvalidSourceDatetime,
  isIsoDateTimeSource,
  requireAccountId,
} from './source-identity.js';
import type { SnsAiAdapterContext, SnsAiFeedbackSource } from './source-types.js';

const FEEDBACK_ACTIONS = ['prefer', 'avoid', 'correct', 'pin', 'note'] as const;
type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];

function isFeedbackAction(value: string): value is FeedbackAction {
  return (FEEDBACK_ACTIONS as readonly string[]).includes(value);
}

function isFeatureDimension(value: string): value is (typeof FEATURE_DIMENSIONS)[number] {
  return (FEATURE_DIMENSIONS as readonly string[]).includes(value);
}

function omitEmpty(value: string | number | null | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const text = String(value).trim();
  return text ? text : undefined;
}

export function feedbackEventId(input: {
  account: string;
  at: string;
  action: string;
  note: string;
  dimension?: string;
  value?: string;
  active: boolean;
}): string {
  const payload = JSON.stringify({
    account: input.account,
    at: input.at,
    action: input.action,
    note: input.note,
    dimension: input.dimension ?? null,
    value: input.value ?? null,
    active: input.active,
  });
  const digest = createHash('sha256').update(payload).digest('hex');
  return `sns-ai:feedback:${digest}`;
}

export function adaptSnsAiHumanFeedback(
  row: SnsAiFeedbackSource,
  context: SnsAiAdapterContext,
): AdapterResult<ExplicitFeedbackEvent> {
  const account = requireAccountId(row.account);
  if (account.status !== 'mapped') {
    return account;
  }
  const note = row.note?.trim() ?? '';
  if (!note) {
    return { status: 'blocked', reason: AdapterReason.emptyFeedbackNote };
  }
  const actionRaw = (row.action ?? '').trim().toLowerCase();
  if (!isFeedbackAction(actionRaw)) {
    return { status: 'blocked', reason: AdapterReason.unknownFeedbackAction };
  }
  if (!row.at || !isIsoDateTimeSource(row.at)) {
    return blockedInvalidSourceDatetime('at');
  }

  const dimensionRaw = row.dimension?.trim();
  if (dimensionRaw && !isFeatureDimension(dimensionRaw)) {
    return { status: 'blocked', reason: AdapterReason.unknownFeedbackDimension };
  }
  const value = omitEmpty(row.value);
  const active = row.active !== false;
  const dimension = dimensionRaw && isFeatureDimension(dimensionRaw) ? dimensionRaw : undefined;

  try {
    const valueEvent = parseExplicitFeedbackEvent({
      meta: buildSnsAiEnvelope(context),
      eventId: feedbackEventId({
        account: account.value,
        at: row.at,
        action: actionRaw,
        note,
        dimension,
        value,
        active,
      }),
      subject: { accountId: account.value },
      action: actionRaw,
      dimension,
      value,
      note,
      active,
      occurredAt: row.at,
    });
    return { status: 'mapped', value: valueEvent };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${AdapterReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
