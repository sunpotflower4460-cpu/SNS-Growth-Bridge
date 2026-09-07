import { describe, expect, it } from 'vitest';

import { accountLinkId } from './link-id.js';
import { bindActiveLinkToEvidence, resolveActiveAccountLink } from './resolve-link.js';
import { CONTEXT, igConfig, mySnsIg, mySnsX, snsAiIg, snsAiX, xConfig } from './test-utils.js';
import { LinkReason } from './types.js';
import { validateAccountLinkSet } from './validate-link-set.js';
import { toCanonicalAccountLink } from './validate-link.js';

describe('explicit account links', () => {
  it('maps an X↔X active link without creatorId', () => {
    const result = validateAccountLinkSet({
      configs: [xConfig()],
      mySnsAccounts: [mySnsX()],
      snsAiAccounts: [snsAiX()],
      context: CONTEXT,
    });
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    const link = result.value[0];
    expect(link?.platform).toBe('x');
    expect(link?.status).toBe('active');
    expect(link?.confirmation).toBe('explicit-operator');
    expect(link?.mySns).toEqual({ workspaceId: 'ws_fixture', socialAccountId: 'my_x_fixture' });
    expect(link?.snsAi).toEqual({ accountId: 'artist-x-fixture' });
    expect(JSON.stringify(link)).not.toContain('creatorId');
    expect(JSON.stringify(link)).not.toContain('not-an-identity-key');
    expect(JSON.stringify(link)).not.toContain('ext_should_not_map');
  });

  it('maps an Instagram↔Instagram active link', () => {
    const result = validateAccountLinkSet({
      configs: [igConfig()],
      mySnsAccounts: [mySnsIg()],
      snsAiAccounts: [snsAiIg()],
      context: CONTEXT,
    });
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value[0]?.platform).toBe('instagram');
  });

  it('parses a disabled link but does not resolve it as active', () => {
    const parsed = validateAccountLinkSet({
      configs: [xConfig({ enabled: false })],
      mySnsAccounts: [mySnsX()],
      snsAiAccounts: [snsAiX()],
      context: CONTEXT,
    });
    expect(parsed.status).toBe('mapped');
    if (parsed.status !== 'mapped') {
      return;
    }
    expect(parsed.value[0]?.status).toBe('disabled');
    expect(resolveActiveAccountLink(parsed.value, { workspaceId: 'ws_fixture', socialAccountId: 'my_x_fixture' })).toEqual(
      { status: 'blocked', reason: LinkReason.linkDisabled },
    );
  });

  it('returns the same Canonical link for the same operator input', () => {
    const first = validateAccountLinkSet({
      configs: [xConfig()],
      mySnsAccounts: [mySnsX()],
      snsAiAccounts: [snsAiX()],
      context: CONTEXT,
    });
    const second = validateAccountLinkSet({
      configs: [xConfig()],
      mySnsAccounts: [mySnsX()],
      snsAiAccounts: [snsAiX()],
      context: CONTEXT,
    });
    expect(first).toEqual(second);
  });

  it('computes a deterministic linkId', () => {
    const first = toCanonicalAccountLink(xConfig(), CONTEXT);
    const second = toCanonicalAccountLink(xConfig(), CONTEXT);
    expect(first).toEqual(second);
    expect(first.status).toBe('mapped');
    if (first.status !== 'mapped') {
      return;
    }
    expect(first.value.linkId).toBe(
      accountLinkId({
        workspaceId: 'ws_fixture',
        socialAccountId: 'my_x_fixture',
        snsAiAccountId: 'artist-x-fixture',
        platform: 'x',
      }),
    );
    expect(first.value.linkId.startsWith('bridge-account-link:')).toBe(true);
  });

  it('allows SNS-AI enabled=false and My-SNS connected=false as identity', () => {
    const result = validateAccountLinkSet({
      configs: [xConfig()],
      mySnsAccounts: [mySnsX({ connected: false })],
      snsAiAccounts: [snsAiX({ enabled: false })],
      context: CONTEXT,
    });
    expect(result.status).toBe('mapped');
  });
});

describe('link negatives', () => {
  it('rejects empty workspaceId', () => {
    expect(toCanonicalAccountLink(xConfig({ workspaceId: '  ' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: LinkReason.emptyWorkspaceId,
    });
  });

  it('rejects empty socialAccountId', () => {
    expect(toCanonicalAccountLink(xConfig({ socialAccountId: '' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: LinkReason.emptySocialAccountId,
    });
  });

  it('rejects empty SNS-AI accountId', () => {
    expect(toCanonicalAccountLink(xConfig({ snsAiAccountId: '' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: LinkReason.emptySnsAiAccountId,
    });
  });

  it('rejects missing My-SNS descriptor', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig()],
        mySnsAccounts: [],
        snsAiAccounts: [snsAiX()],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.missingMySnsDescriptor });
  });

  it('rejects missing SNS-AI descriptor', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig()],
        mySnsAccounts: [mySnsX()],
        snsAiAccounts: [],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.missingSnsAiDescriptor });
  });

  it('rejects platform mismatch', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig()],
        mySnsAccounts: [mySnsX({ platform: 'instagram' })],
        snsAiAccounts: [snsAiX()],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.platformMismatch });
  });

  it('rejects duplicate My-SNS mapping across SNS-AI accounts', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig(), xConfig({ snsAiAccountId: 'artist-x-other' })],
        mySnsAccounts: [mySnsX()],
        snsAiAccounts: [snsAiX(), snsAiX({ accountId: 'artist-x-other' })],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.duplicateMySnsMapping });
  });

  it('rejects duplicate SNS-AI mapping across My-SNS social accounts', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig(), xConfig({ socialAccountId: 'my_x_other' })],
        mySnsAccounts: [mySnsX(), mySnsX({ socialAccountId: 'my_x_other' })],
        snsAiAccounts: [snsAiX()],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.duplicateSnsAiMapping });
  });

  it('rejects identical duplicate entries', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig(), xConfig()],
        mySnsAccounts: [mySnsX()],
        snsAiAccounts: [snsAiX()],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.duplicateLinkEntry });
  });

  it('rejects source account descriptor mismatch', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig()],
        mySnsAccounts: [{ workspaceId: '  ', socialAccountId: 'my_x_fixture', platform: 'x', connected: false }],
        snsAiAccounts: [snsAiX()],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.descriptorMismatch });
  });

  it('rejects unsupported platform', () => {
    expect(toCanonicalAccountLink(xConfig({ platform: 'line' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: LinkReason.unsupportedPlatform,
    });
  });

  it('rejects descriptor mismatch when My-SNS platform disagrees with config', () => {
    expect(
      validateAccountLinkSet({
        configs: [xConfig({ platform: 'x' })],
        mySnsAccounts: [mySnsX({ platform: 'tiktok' })],
        snsAiAccounts: [snsAiX()],
        context: CONTEXT,
      }),
    ).toEqual({ status: 'blocked', reason: LinkReason.platformMismatch });
  });

  it('does not bind disabled links or mismatched evidence', () => {
    const parsed = validateAccountLinkSet({
      configs: [xConfig({ enabled: false })],
      mySnsAccounts: [mySnsX()],
      snsAiAccounts: [snsAiX()],
      context: CONTEXT,
    });
    expect(parsed.status).toBe('mapped');
    if (parsed.status !== 'mapped' || !parsed.value[0]) {
      return;
    }
    expect(bindActiveLinkToEvidence(parsed.value[0], { accountId: 'artist-x-fixture', platform: 'x' })).toEqual({
      status: 'blocked',
      reason: LinkReason.linkDisabled,
    });
    const active = validateAccountLinkSet({
      configs: [xConfig()],
      mySnsAccounts: [mySnsX()],
      snsAiAccounts: [snsAiX()],
      context: CONTEXT,
    });
    if (active.status !== 'mapped' || !active.value[0]) {
      return;
    }
    expect(bindActiveLinkToEvidence(active.value[0], { accountId: 'other', platform: 'x' }).status).toBe('blocked');
    expect(bindActiveLinkToEvidence(active.value[0], { accountId: 'artist-x-fixture', platform: 'instagram' }).status).toBe(
      'blocked',
    );
  });
});
