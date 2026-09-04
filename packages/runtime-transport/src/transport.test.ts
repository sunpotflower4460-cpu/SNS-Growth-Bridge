import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SNS_AI_RUNTIME_POLICY_INVARIANTS } from '@sns-growth-bridge/adapters-sns-ai';
import {
  validateAccountLinkSet,
  bindActiveLinkToEvidence,
  type MySnsAccountDescriptor,
  type OperatorAccountLinkConfig,
  type SnsAiAccountDescriptor,
} from '@sns-growth-bridge/identity-links';
import { describe, expect, it } from 'vitest';

import { buildLinkedShadowStrategy, likesDoNotAffectScore } from './linked-strategy.js';
import { loadSnsAiEvidenceBundle } from './load-evidence.js';
import { TransportReason } from './types.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

const CONTEXT = {
  producedAt: '2026-09-04T00:00:00.000Z',
  traceId: 'trace_transport',
  loadedAt: '2026-09-04T00:00:00.000Z',
  sourceCommitSha: '914c70ee4666015f93603eef9a2f3dd9a1a7de08',
};

function validInput(over: Partial<Parameters<typeof loadSnsAiEvidenceBundle>[0]> = {}) {
  return {
    paths: {
      historyPath: join(fixturesRoot, 'history.valid.jsonl'),
      metricsPath: join(fixturesRoot, 'metrics.valid.jsonl'),
      feedbackPath: join(fixturesRoot, 'feedback.valid.jsonl'),
    },
    accountId: 'artist-x-fixture',
    platform: 'x' as const,
    sourceCommitSha: CONTEXT.sourceCommitSha,
    loadedAt: CONTEXT.loadedAt,
    traceId: CONTEXT.traceId,
    ...over,
  };
}

function xConfig(): OperatorAccountLinkConfig {
  return {
    workspaceId: 'ws_fixture',
    socialAccountId: 'my_x_fixture',
    snsAiAccountId: 'artist-x-fixture',
    platform: 'x',
    enabled: true,
  };
}

function mySns(): MySnsAccountDescriptor {
  return {
    workspaceId: 'ws_fixture',
    socialAccountId: 'my_x_fixture',
    platform: 'x',
    connected: false,
  };
}

function snsAi(): SnsAiAccountDescriptor {
  return { accountId: 'artist-x-fixture', platform: 'x', enabled: false, mode: 'pause' };
}

describe('read-only SNS-AI transport', () => {
  it('loads valid history, metrics, and feedback for the target account only', async () => {
    const result = await loadSnsAiEvidenceBundle(validInput());
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.accountId).toBe('artist-x-fixture');
    expect(result.value.publishedPosts).toHaveLength(2);
    expect(result.value.metrics).toHaveLength(2);
    expect(result.value.feedback).toHaveLength(1);
    expect(result.value.counts).toEqual({ historyRows: 3, metricRows: 2, feedbackRows: 1 });
    expect(result.value.metrics.every((row) => row.subject.accountId === 'artist-x-fixture')).toBe(true);
    expect(result.value.metrics.some((row) => row.metrics.likes === 10)).toBe(true);
  });

  it('skips blank lines and maps the remaining objects', async () => {
    const result = await loadSnsAiEvidenceBundle(validInput());
    expect(result.status).toBe('mapped');
  });

  it('fails closed on malformed JSONL', async () => {
    const result = await loadSnsAiEvidenceBundle(
      validInput({ paths: { ...validInput().paths, historyPath: join(fixturesRoot, 'history.malformed.jsonl') } }),
    );
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${TransportReason.malformedJsonl}:`)).toBe(true);
  });

  it('fails closed on non-object JSONL rows', async () => {
    const result = await loadSnsAiEvidenceBundle(
      validInput({ paths: { ...validInput().paths, historyPath: join(fixturesRoot, 'history.non-object.jsonl') } }),
    );
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${TransportReason.nonObjectRow}:`)).toBe(true);
  });

  it('fails closed when a file exceeds maxBytes', async () => {
    const result = await loadSnsAiEvidenceBundle(validInput({ maxBytesPerFile: 32 }));
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${TransportReason.fileTooLarge}:`)).toBe(true);
  });

  it('fails closed when rows exceed maxRows', async () => {
    const result = await loadSnsAiEvidenceBundle(validInput({ maxRowsPerFile: 1 }));
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${TransportReason.rowLimitExceeded}:`)).toBe(true);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['0', 0],
    ['-1', -1],
    ['non-integer', 1.5],
  ])('fails closed when maxBytesPerFile is %s', async (_label, maxBytesPerFile) => {
    const result = await loadSnsAiEvidenceBundle(validInput({ maxBytesPerFile }));
    expect(result).toEqual({ status: 'blocked', reason: TransportReason.invalidMaxBytesPerFile });
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['0', 0],
    ['-1', -1],
    ['non-integer', 1.5],
  ])('fails closed when maxRowsPerFile is %s', async (_label, maxRowsPerFile) => {
    const result = await loadSnsAiEvidenceBundle(validInput({ maxRowsPerFile }));
    expect(result).toEqual({ status: 'blocked', reason: TransportReason.invalidMaxRowsPerFile });
  });

  it('fails closed when loadedAt is not an offset ISO datetime', async () => {
    const result = await loadSnsAiEvidenceBundle(validInput({ loadedAt: '2026-09-04T00:00:00' }));
    expect(result).toEqual({ status: 'blocked', reason: TransportReason.invalidLoadedAt });
  });

  it('does not map an empty-evidence bundle when loadedAt is invalid', async () => {
    const emptyPath = join(fixturesRoot, 'empty.jsonl');
    const result = await loadSnsAiEvidenceBundle(
      validInput({
        paths: { historyPath: emptyPath, metricsPath: emptyPath, feedbackPath: emptyPath },
        loadedAt: 'not-a-date',
      }),
    );
    expect(result).toEqual({ status: 'blocked', reason: TransportReason.invalidLoadedAt });
  });

  it('maps empty JSONL with a valid loadedAt instead of inventing evidence', async () => {
    const emptyPath = join(fixturesRoot, 'empty.jsonl');
    const result = await loadSnsAiEvidenceBundle(
      validInput({
        paths: { historyPath: emptyPath, metricsPath: emptyPath, feedbackPath: emptyPath },
      }),
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.loadedAt).toBe(CONTEXT.loadedAt);
    expect(result.value.counts).toEqual({ historyRows: 0, metricRows: 0, feedbackRows: 0 });
    expect(result.value.publishedPosts).toEqual([]);
  });

  it('ignores unrelated accounts and maps the target account', async () => {
    const result = await loadSnsAiEvidenceBundle(validInput());
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(JSON.stringify(result.value)).not.toContain('other-account');
    expect(JSON.stringify(result.value)).not.toContain('ext_other');
    expect(result.value.metrics.every((row) => row.subject.workspaceId === undefined)).toBe(true);
    expect(JSON.stringify(result.value)).not.toContain('ws_fixture');
  });

  it('fails closed when a source file is missing, without leaking the path', async () => {
    const missingPath = join(fixturesRoot, 'history.missing.jsonl');
    const result = await loadSnsAiEvidenceBundle(
      validInput({ paths: { ...validInput().paths, historyPath: missingPath } }),
    );
    expect(result).toEqual({ status: 'blocked', reason: `${TransportReason.fileNotFound}: history` });
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason).not.toContain(missingPath);
    expect(result.reason).not.toContain(fixturesRoot);
  });

  it('blocks platform mismatch on the target account', async () => {
    const result = await loadSnsAiEvidenceBundle(
      validInput({
        paths: { ...validInput().paths, historyPath: join(fixturesRoot, 'history.platform-mismatch.jsonl') },
      }),
    );
    expect(result).toEqual({ status: 'blocked', reason: TransportReason.platformMismatch });
  });

  it('does not emit raw media URLs or absolute source paths', async () => {
    const input = validInput();
    const result = await loadSnsAiEvidenceBundle(input);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    const serialized = JSON.stringify(result.value);
    expect(serialized).not.toContain('mediaUrl');
    expect(serialized).not.toContain('X-Amz-Signature');
    expect(serialized).not.toContain(input.paths.historyPath);
    expect(serialized).not.toContain(fixturesRoot);
    expect(result.value.strategyPosts[0]?.hasLegacyMediaUrl).toBe(true);
  });

  it('is deterministic for the same caller inputs', async () => {
    const first = await loadSnsAiEvidenceBundle(validInput());
    const second = await loadSnsAiEvidenceBundle(validInput());
    expect(first).toEqual(second);
    expect(first.status).toBe('mapped');
    if (first.status !== 'mapped') {
      return;
    }
    expect(first.value.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not mutate input files', async () => {
    const input = validInput();
    const before = {
      history: readFileSync(input.paths.historyPath, 'utf8'),
      metrics: readFileSync(input.paths.metricsPath, 'utf8'),
      feedback: readFileSync(input.paths.feedbackPath, 'utf8'),
    };
    await loadSnsAiEvidenceBundle(input);
    expect(readFileSync(input.paths.historyPath, 'utf8')).toBe(before.history);
    expect(readFileSync(input.paths.metricsPath, 'utf8')).toBe(before.metrics);
    expect(readFileSync(input.paths.feedbackPath, 'utf8')).toBe(before.feedback);
  });
});

describe('offline linked strategy E2E', () => {
  it('projects workspaceId + accountId from an explicit active link', async () => {
    const bundleResult = await loadSnsAiEvidenceBundle(validInput());
    const links = validateAccountLinkSet({
      configs: [xConfig()],
      mySnsAccounts: [mySns()],
      snsAiAccounts: [snsAi()],
      context: { producedAt: CONTEXT.producedAt, traceId: CONTEXT.traceId },
    });
    expect(bundleResult.status).toBe('mapped');
    expect(links.status).toBe('mapped');
    if (bundleResult.status !== 'mapped' || links.status !== 'mapped' || !links.value[0]) {
      return;
    }
    expect(likesDoNotAffectScore(bundleResult.value)).toBe(true);
    const strategy = buildLinkedShadowStrategy({
      link: links.value[0],
      bundle: bundleResult.value,
      now: '2026-09-04T12:00:00.000Z',
      producedAt: CONTEXT.producedAt,
      traceId: CONTEXT.traceId,
    });
    expect(strategy.status).toBe('mapped');
    if (strategy.status !== 'mapped') {
      return;
    }
    expect(strategy.value.subject).toEqual({ workspaceId: 'ws_fixture', accountId: 'artist-x-fixture' });
    expect(strategy.value.subject.creatorId).toBeUndefined();
    expect(strategy.value.platform).toBe('x');
    expect(JSON.stringify(strategy.value)).not.toContain('creatorId');
    expect(JSON.stringify(strategy.value)).not.toContain('X-Amz-Signature');
    expect(SNS_AI_RUNTIME_POLICY_INVARIANTS.manualOnly).toBe(true);
    expect(SNS_AI_RUNTIME_POLICY_INVARIANTS.allowAutomaticAccountActivation).toBe(false);
  });

  it('does not project a workspace from the wrong or disabled link', async () => {
    const bundleResult = await loadSnsAiEvidenceBundle(validInput());
    expect(bundleResult.status).toBe('mapped');
    if (bundleResult.status !== 'mapped') {
      return;
    }
    const wrong = validateAccountLinkSet({
      configs: [
        {
          workspaceId: 'ws_other',
          socialAccountId: 'my_x_other',
          snsAiAccountId: 'artist-x-fixture',
          platform: 'x',
          enabled: true,
        },
      ],
      mySnsAccounts: [{ workspaceId: 'ws_other', socialAccountId: 'my_x_other', platform: 'x', connected: false }],
      snsAiAccounts: [snsAi()],
      context: { producedAt: CONTEXT.producedAt, traceId: CONTEXT.traceId },
    });
    expect(wrong.status).toBe('mapped');
    if (wrong.status !== 'mapped' || !wrong.value[0]) {
      return;
    }
    const bound = bindActiveLinkToEvidence(wrong.value[0], {
      accountId: bundleResult.value.accountId,
      platform: bundleResult.value.platform,
    });
    expect(bound.status).toBe('mapped');
    if (bound.status === 'mapped') {
      expect(bound.value.subject.workspaceId).toBe('ws_other');
      expect(bound.value.subject.workspaceId).not.toBe('ws_fixture');
    }

    const disabled = validateAccountLinkSet({
      configs: [{ ...xConfig(), enabled: false }],
      mySnsAccounts: [mySns()],
      snsAiAccounts: [snsAi()],
      context: { producedAt: CONTEXT.producedAt, traceId: CONTEXT.traceId },
    });
    if (disabled.status !== 'mapped' || !disabled.value[0]) {
      return;
    }
    expect(
      buildLinkedShadowStrategy({
        link: disabled.value[0],
        bundle: bundleResult.value,
        now: '2026-09-04T12:00:00.000Z',
        producedAt: CONTEXT.producedAt,
        traceId: CONTEXT.traceId,
      }).status,
    ).toBe('blocked');
  });
});
