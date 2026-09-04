import type { CrossProductAccountLink, Platform } from '@sns-growth-bridge/contracts';

import { LinkReason, type LinkedEvidenceBinding, type LinkedSubject, type LinkResult } from './types.js';

export function linkedSubject(link: CrossProductAccountLink): LinkedSubject {
  return {
    workspaceId: link.mySns.workspaceId,
    accountId: link.snsAi.accountId,
  };
}

export function resolveActiveAccountLink(
  links: readonly CrossProductAccountLink[],
  query: {
    workspaceId: string;
    socialAccountId: string;
  },
): LinkResult<CrossProductAccountLink> {
  const workspaceId = query.workspaceId.trim();
  const socialAccountId = query.socialAccountId.trim();
  const matches = links.filter(
    (link) => link.mySns.workspaceId === workspaceId && link.mySns.socialAccountId === socialAccountId,
  );
  const active = matches.filter((link) => link.status === 'active');
  if (active.length > 1) {
    return { status: 'blocked', reason: LinkReason.duplicateMySnsMapping };
  }
  const resolved = active[0];
  if (resolved) {
    return { status: 'mapped', value: resolved };
  }
  if (matches.length > 0) {
    return { status: 'blocked', reason: LinkReason.linkDisabled };
  }
  return { status: 'blocked', reason: LinkReason.missingMySnsDescriptor };
}

export function bindActiveLinkToEvidence(
  link: CrossProductAccountLink,
  evidence: { accountId: string; platform: Platform },
): LinkResult<LinkedEvidenceBinding> {
  if (link.status !== 'active') {
    return { status: 'blocked', reason: LinkReason.linkDisabled };
  }
  if (link.snsAi.accountId !== evidence.accountId) {
    return { status: 'blocked', reason: LinkReason.evidenceAccountMismatch };
  }
  if (link.platform !== evidence.platform) {
    return { status: 'blocked', reason: LinkReason.evidencePlatformMismatch };
  }
  const subject = linkedSubject(link);
  return {
    status: 'mapped',
    value: {
      subject,
      platform: link.platform,
      meta: link.meta,
    },
  };
}
