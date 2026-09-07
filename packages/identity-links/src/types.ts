import type { EnvelopeMeta, Platform } from '@sns-growth-bridge/contracts';

export interface OperatorAccountLinkConfig {
  workspaceId: string;
  socialAccountId: string;
  snsAiAccountId: string;
  platform: string;
  enabled: boolean;
}

export interface MySnsAccountDescriptor {
  workspaceId: string;
  socialAccountId: string;
  platform: string;
  connected: boolean;
  externalAccountId?: string;
  handle?: string;
}

export interface SnsAiAccountDescriptor {
  accountId: string;
  platform: string;
  enabled: boolean;
  mode?: string;
}

export interface LinkAdapterContext {
  producedAt: string;
  traceId: string;
  confirmedAt?: string;
}

export type LinkResult<T> =
  | { status: 'mapped'; value: T }
  | { status: 'blocked'; reason: string };

export const LinkReason = {
  emptyWorkspaceId: 'empty-workspace-id',
  emptySocialAccountId: 'empty-social-account-id',
  emptySnsAiAccountId: 'empty-sns-ai-account-id',
  missingMySnsDescriptor: 'missing-my-sns-descriptor',
  missingSnsAiDescriptor: 'missing-sns-ai-descriptor',
  platformMismatch: 'platform-mismatch',
  unsupportedPlatform: 'unsupported-platform',
  descriptorMismatch: 'source-account-descriptor-mismatch',
  duplicateMySnsMapping: 'duplicate-my-sns-mapping',
  duplicateSnsAiMapping: 'duplicate-sns-ai-mapping',
  duplicateLinkEntry: 'duplicate-link-entry',
  linkDisabled: 'link-disabled',
  evidenceAccountMismatch: 'evidence-account-mismatch',
  evidencePlatformMismatch: 'evidence-platform-mismatch',
  canonicalValidationFailed: 'canonical-validation-failed',
} as const;

export interface LinkedSubject {
  workspaceId: string;
  accountId: string;
}

export interface LinkedEvidenceBinding {
  subject: LinkedSubject;
  platform: Platform;
  meta: EnvelopeMeta;
}
