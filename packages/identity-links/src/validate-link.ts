import {
  isContractValidationError,
  parseCrossProductAccountLink,
  platformSchema,
  type CrossProductAccountLink,
  type Platform,
} from '@sns-growth-bridge/contracts';

import { accountLinkId } from './link-id.js';
import { LinkReason, type LinkAdapterContext, type LinkResult, type OperatorAccountLinkConfig } from './types.js';

function trimId(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function parseCanonicalPlatform(value: string | undefined): LinkResult<Platform> {
  const trimmed = trimId(value);
  const parsed = platformSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { status: 'blocked', reason: LinkReason.unsupportedPlatform };
  }
  return { status: 'mapped', value: parsed.data };
}

export function validateOperatorConfigIds(config: OperatorAccountLinkConfig): LinkResult<{
  workspaceId: string;
  socialAccountId: string;
  snsAiAccountId: string;
  platform: Platform;
  enabled: boolean;
}> {
  const workspaceId = trimId(config.workspaceId);
  const socialAccountId = trimId(config.socialAccountId);
  const snsAiAccountId = trimId(config.snsAiAccountId);
  if (!workspaceId) {
    return { status: 'blocked', reason: LinkReason.emptyWorkspaceId };
  }
  if (!socialAccountId) {
    return { status: 'blocked', reason: LinkReason.emptySocialAccountId };
  }
  if (!snsAiAccountId) {
    return { status: 'blocked', reason: LinkReason.emptySnsAiAccountId };
  }
  const platform = parseCanonicalPlatform(config.platform);
  if (platform.status !== 'mapped') {
    return platform;
  }
  return {
    status: 'mapped',
    value: {
      workspaceId,
      socialAccountId,
      snsAiAccountId,
      platform: platform.value,
      enabled: config.enabled,
    },
  };
}

export function toCanonicalAccountLink(
  config: OperatorAccountLinkConfig,
  context: LinkAdapterContext,
): LinkResult<CrossProductAccountLink> {
  const ids = validateOperatorConfigIds(config);
  if (ids.status !== 'mapped') {
    return ids;
  }
  try {
    const value = parseCrossProductAccountLink({
      meta: {
        schemaVersion: 1,
        producer: 'sns-growth-bridge',
        producedAt: context.producedAt,
        traceId: context.traceId,
      },
      linkId: accountLinkId(ids.value),
      platform: ids.value.platform,
      mySns: {
        workspaceId: ids.value.workspaceId,
        socialAccountId: ids.value.socialAccountId,
      },
      snsAi: {
        accountId: ids.value.snsAiAccountId,
      },
      status: ids.value.enabled ? 'active' : 'disabled',
      confirmation: 'explicit-operator',
      confirmedAt: context.confirmedAt ?? context.producedAt,
    });
    return { status: 'mapped', value };
  } catch (error) {
    if (isContractValidationError(error)) {
      return { status: 'blocked', reason: `${LinkReason.canonicalValidationFailed}: ${error.message}` };
    }
    throw error;
  }
}
