import type { CrossProductAccountLink, Platform } from '@sns-growth-bridge/contracts';

import {
  LinkReason,
  type LinkAdapterContext,
  type LinkResult,
  type MySnsAccountDescriptor,
  type OperatorAccountLinkConfig,
  type SnsAiAccountDescriptor,
} from './types.js';
import { parseCanonicalPlatform, toCanonicalAccountLink, validateOperatorConfigIds } from './validate-link.js';

function trimId(value: string | undefined): string {
  return value?.trim() ?? '';
}

function mySnsKey(workspaceId: string, socialAccountId: string): string {
  return `${workspaceId}\0${socialAccountId}`;
}

function descriptorPlatform(
  descriptor: { platform: string },
  expected: Platform,
): LinkResult<Platform> {
  const parsed = parseCanonicalPlatform(descriptor.platform);
  if (parsed.status !== 'mapped') {
    return parsed;
  }
  if (parsed.value !== expected) {
    return { status: 'blocked', reason: LinkReason.platformMismatch };
  }
  return parsed;
}

export function validateAccountLinkSet(input: {
  configs: readonly OperatorAccountLinkConfig[];
  mySnsAccounts: readonly MySnsAccountDescriptor[];
  snsAiAccounts: readonly SnsAiAccountDescriptor[];
  context: LinkAdapterContext;
}): LinkResult<CrossProductAccountLink[]> {
  const mySnsByKey = new Map<string, MySnsAccountDescriptor>();
  for (const descriptor of input.mySnsAccounts) {
    const workspaceId = trimId(descriptor.workspaceId);
    const socialAccountId = trimId(descriptor.socialAccountId);
    if (!workspaceId || !socialAccountId) {
      return { status: 'blocked', reason: LinkReason.descriptorMismatch };
    }
    const key = mySnsKey(workspaceId, socialAccountId);
    const existing = mySnsByKey.get(key);
    if (existing && existing.platform !== descriptor.platform) {
      return { status: 'blocked', reason: LinkReason.descriptorMismatch };
    }
    mySnsByKey.set(key, descriptor);
  }

  const snsAiById = new Map<string, SnsAiAccountDescriptor>();
  for (const descriptor of input.snsAiAccounts) {
    const accountId = trimId(descriptor.accountId);
    if (!accountId) {
      return { status: 'blocked', reason: LinkReason.descriptorMismatch };
    }
    const existing = snsAiById.get(accountId);
    if (existing && existing.platform !== descriptor.platform) {
      return { status: 'blocked', reason: LinkReason.descriptorMismatch };
    }
    snsAiById.set(accountId, descriptor);
  }

  const links: CrossProductAccountLink[] = [];
  const seenFull = new Set<string>();
  const seenMySns = new Set<string>();
  const seenSnsAi = new Set<string>();

  for (const config of input.configs) {
    const ids = validateOperatorConfigIds(config);
    if (ids.status !== 'mapped') {
      return ids;
    }
    const myKey = mySnsKey(ids.value.workspaceId, ids.value.socialAccountId);
    const fullKey = `${myKey}\0${ids.value.snsAiAccountId}\0${ids.value.platform}`;
    if (seenFull.has(fullKey)) {
      return { status: 'blocked', reason: LinkReason.duplicateLinkEntry };
    }
    seenFull.add(fullKey);

    const mySns = mySnsByKey.get(myKey);
    if (!mySns) {
      return { status: 'blocked', reason: LinkReason.missingMySnsDescriptor };
    }
    if (trimId(mySns.workspaceId) !== ids.value.workspaceId || trimId(mySns.socialAccountId) !== ids.value.socialAccountId) {
      return { status: 'blocked', reason: LinkReason.descriptorMismatch };
    }
    const myPlatform = descriptorPlatform(mySns, ids.value.platform);
    if (myPlatform.status !== 'mapped') {
      return myPlatform;
    }

    const snsAi = snsAiById.get(ids.value.snsAiAccountId);
    if (!snsAi) {
      return { status: 'blocked', reason: LinkReason.missingSnsAiDescriptor };
    }
    if (trimId(snsAi.accountId) !== ids.value.snsAiAccountId) {
      return { status: 'blocked', reason: LinkReason.descriptorMismatch };
    }
    const aiPlatform = descriptorPlatform(snsAi, ids.value.platform);
    if (aiPlatform.status !== 'mapped') {
      return aiPlatform;
    }

    const canonical = toCanonicalAccountLink(config, input.context);
    if (canonical.status !== 'mapped') {
      return canonical;
    }
    if (seenMySns.has(myKey)) {
      return { status: 'blocked', reason: LinkReason.duplicateMySnsMapping };
    }
    if (seenSnsAi.has(ids.value.snsAiAccountId)) {
      return { status: 'blocked', reason: LinkReason.duplicateSnsAiMapping };
    }
    seenMySns.add(myKey);
    seenSnsAi.add(ids.value.snsAiAccountId);
    links.push(canonical.value);
  }

  return { status: 'mapped', value: links };
}
