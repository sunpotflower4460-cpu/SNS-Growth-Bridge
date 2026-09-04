import type { StrategyPostEvidence } from '@sns-growth-bridge/strategy';

import { pickKnownFeatures } from './normalization.js';
import { AdapterReason, type AdapterResult } from './result.js';
import {
  blockedInvalidSourceDatetime,
  isIsoDateTimeSource,
  isNonEmptySourceId,
  requireAccountId,
  sourceIdText,
} from './source-identity.js';
import type { SnsAiHistorySource } from './source-types.js';

export function adaptSnsAiHistoryToStrategyPostEvidence(input: {
  row: SnsAiHistorySource;
  accountId?: string;
}): AdapterResult<StrategyPostEvidence> {
  const account = requireAccountId(input.row.account);
  if (account.status !== 'mapped') {
    return account;
  }
  if (input.accountId !== undefined && input.accountId !== account.value) {
    return { status: 'blocked', reason: AdapterReason.crossAccount };
  }
  const providerPostId = sourceIdText(input.row.providerPostId);
  if (providerPostId === undefined || !isNonEmptySourceId(providerPostId)) {
    return { status: 'not-applicable', reason: AdapterReason.missingProviderPostId };
  }
  if (!input.row.at || !isIsoDateTimeSource(input.row.at)) {
    return blockedInvalidSourceDatetime('at');
  }
  return {
    status: 'mapped',
    value: {
      accountId: account.value,
      externalPostId: providerPostId.trim(),
      publishedAt: input.row.at,
      features: pickKnownFeatures(input.row.features),
      hasLegacyMediaUrl: Boolean(input.row.mediaUrl),
    },
  };
}

export function adaptSnsAiHistoryRowsToStrategyPostEvidence(
  rows: readonly SnsAiHistorySource[],
  options: { accountId: string },
): AdapterResult<StrategyPostEvidence[]> {
  if (!isNonEmptySourceId(options.accountId)) {
    return { status: 'blocked', reason: `${AdapterReason.invalidSourceIdentity}: account` };
  }
  const expected = options.accountId.trim();
  const mapped: StrategyPostEvidence[] = [];
  for (const row of rows) {
    const result = adaptSnsAiHistoryToStrategyPostEvidence({ row, accountId: expected });
    if (result.status === 'blocked') {
      return result;
    }
    if (result.status === 'mapped') {
      mapped.push(result.value);
    }
  }
  return { status: 'mapped', value: mapped };
}
