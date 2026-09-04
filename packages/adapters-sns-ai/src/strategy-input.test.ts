import { describe, expect, it } from 'vitest';

import { AdapterReason } from './result.js';
import {
  adaptSnsAiHistoryRowsToStrategyPostEvidence,
  adaptSnsAiHistoryToStrategyPostEvidence,
} from './strategy-input.js';
import { historyRow } from './test-utils.js';

describe('adaptSnsAiHistoryToStrategyPostEvidence', () => {
  it('maps Phase 4 evidence without emitting mediaUrl', () => {
    const result = adaptSnsAiHistoryToStrategyPostEvidence({
      row: historyRow({
        mediaUrl: 'https://example.invalid/private/asset.jpg?signed=1',
        features: { topic: 'music', trendUsed: true },
      }),
    });
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value).toEqual({
      accountId: 'music-tools-x',
      externalPostId: 'ext_x_1',
      publishedAt: '2026-09-03T08:00:00.000Z',
      features: { topic: 'music' },
      hasLegacyMediaUrl: true,
    });
    expect(JSON.stringify(result.value)).not.toContain('https://');
    expect(result.value).not.toHaveProperty('mediaUrl');
  });

  it('sets hasLegacyMediaUrl false when mediaUrl is absent', () => {
    const result = adaptSnsAiHistoryToStrategyPostEvidence({
      row: historyRow({ mediaUrl: null }),
    });
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.hasLegacyMediaUrl).toBe(false);
  });

  it('does not derive postingHour here; Phase 4 historyFeatures owns that', () => {
    const result = adaptSnsAiHistoryToStrategyPostEvidence({ row: historyRow({ features: { topic: 'music' } }) });
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.features.postingHour).toBeUndefined();
  });

  it('skips missing providerPostId', () => {
    expect(
      adaptSnsAiHistoryToStrategyPostEvidence({ row: historyRow({ providerPostId: undefined }) }),
    ).toEqual({ status: 'not-applicable', reason: AdapterReason.missingProviderPostId });
  });

  it('blocks cross-account rows', () => {
    expect(
      adaptSnsAiHistoryToStrategyPostEvidence({
        row: historyRow(),
        accountId: 'example-instagram',
      }),
    ).toEqual({ status: 'blocked', reason: AdapterReason.crossAccount });
  });

  it('blocks mixed-account batches', () => {
    const result = adaptSnsAiHistoryRowsToStrategyPostEvidence(
      [historyRow(), historyRow({ account: 'example-instagram', providerPostId: 'ext_ig_1' })],
      { accountId: 'music-tools-x' },
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.crossAccount });
  });
});
