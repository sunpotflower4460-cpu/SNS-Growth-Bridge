import { describe, expect, it } from 'vitest';

import { adaptSnsAiHistoryToPublishedPost } from './history.js';
import { AdapterReason } from './result.js';
import { CONTEXT, historyRow } from './test-utils.js';

describe('adaptSnsAiHistoryToPublishedPost', () => {
  it('maps a published X post with providerPostId', () => {
    const result = adaptSnsAiHistoryToPublishedPost({ row: historyRow() }, CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.postId).toBe('sns-ai:music-tools-x:ext_x_1');
    expect(result.value.subject).toEqual({ accountId: 'music-tools-x' });
    expect(result.value.subject.creatorId).toBeUndefined();
    expect(result.value.subject.workspaceId).toBeUndefined();
    expect(result.value.platform).toBe('x');
    expect(result.value.externalPostId).toBe('ext_x_1');
    expect(result.value.publishedAt).toBe('2026-09-03T08:00:00.000Z');
    expect(result.value.text).toBe('Synthetic published post');
    expect(result.value.media).toEqual([]);
    expect(result.value.features).toEqual({ topic: 'music', hook: 'question' });
    expect(result.value.meta.producer).toBe('sns-ai');
  });

  it('maps a published Instagram post', () => {
    const result = adaptSnsAiHistoryToPublishedPost(
      { row: historyRow({ platform: 'instagram', providerPostId: 'ext_ig_1' }) },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.platform).toBe('instagram');
    expect(result.value.externalPostId).toBe('ext_ig_1');
  });

  it('skips missing providerPostId', () => {
    const result = adaptSnsAiHistoryToPublishedPost(
      { row: historyRow({ providerPostId: undefined }) },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.missingProviderPostId });
  });

  it('blocks empty account instead of prefix-laundering postId', () => {
    const result = adaptSnsAiHistoryToPublishedPost({ row: historyRow({ account: '' }) }, CONTEXT);
    expect(result).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: account`,
    });
  });

  it('blocks invalid at', () => {
    const result = adaptSnsAiHistoryToPublishedPost({ row: historyRow({ at: 'not-a-date' }) }, CONTEXT);
    expect(result).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: at`,
    });
  });

  it('blocks unknown platform and does not infer it from accountId', () => {
    const result = adaptSnsAiHistoryToPublishedPost(
      { row: historyRow({ platform: 'line', account: 'music-tools-x' }) },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.unknownPlatform });
  });

  it('requires caller platform when row.platform is absent', () => {
    const missing = adaptSnsAiHistoryToPublishedPost({ row: historyRow({ platform: undefined }) }, CONTEXT);
    expect(missing).toEqual({ status: 'blocked', reason: AdapterReason.missingPlatform });
    const supplied = adaptSnsAiHistoryToPublishedPost(
      { row: historyRow({ platform: undefined }), platform: 'x' },
      CONTEXT,
    );
    expect(supplied.status).toBe('mapped');
  });

  it('blocks caller/row platform mismatch', () => {
    const result = adaptSnsAiHistoryToPublishedPost(
      { row: historyRow({ platform: 'x' }), platform: 'instagram' },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.platformMismatch });
  });

  it('skips non-published status', () => {
    const result = adaptSnsAiHistoryToPublishedPost({ row: historyRow({ status: 'failed' }) }, CONTEXT);
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.notPublished });
  });

  it('keeps known features and strips unknown keys', () => {
    const result = adaptSnsAiHistoryToPublishedPost(
      {
        row: historyRow({
          features: { topic: 'music', trendUsed: true, unknownDim: 'drop-me', postingHour: '08:00' },
        }),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.features).toEqual({ topic: 'music', postingHour: '08:00' });
    expect(JSON.stringify(result.value)).not.toContain('trendUsed');
    expect(JSON.stringify(result.value)).not.toContain('drop-me');
  });

  it('does not emit mediaUrl onto Canonical output', () => {
    const result = adaptSnsAiHistoryToPublishedPost(
      {
        row: historyRow({
          mediaUrl: 'https://example.invalid/signed?X-Amz-Signature=abc',
        }),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.media).toEqual([]);
    expect(JSON.stringify(result.value)).not.toContain('mediaUrl');
    expect(JSON.stringify(result.value)).not.toContain('X-Amz-Signature');
    expect(JSON.stringify(result.value)).not.toContain('example.invalid');
  });

  it('does not invent creatorId or workspaceId', () => {
    const result = adaptSnsAiHistoryToPublishedPost({ row: historyRow() }, CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(JSON.stringify(result.value)).not.toContain('creatorId');
    expect(JSON.stringify(result.value)).not.toContain('workspaceId');
  });

  it('does not mutate input', () => {
    const input = { row: historyRow({ features: { topic: 'music' } }) };
    const before = structuredClone(input);
    adaptSnsAiHistoryToPublishedPost(input, CONTEXT);
    expect(input).toEqual(before);
  });

  it('is deterministic', () => {
    const input = { row: historyRow() };
    expect(adaptSnsAiHistoryToPublishedPost(input, CONTEXT)).toEqual(
      adaptSnsAiHistoryToPublishedPost(input, CONTEXT),
    );
  });
});
