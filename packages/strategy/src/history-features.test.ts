import { describe, expect, it } from 'vitest';

import { historyFeatures } from './history-features.js';
import type { StrategyPostEvidence } from './types.js';

function entry(overrides: Partial<StrategyPostEvidence>): StrategyPostEvidence {
  return {
    accountId: 'acct_1',
    externalPostId: 'p1',
    publishedAt: '2026-08-20T00:00:00.000Z',
    features: {},
    hasLegacyMediaUrl: false,
    ...overrides,
  };
}

describe('historyFeatures', () => {
  it('preserves an explicit mediaDecision instead of applying the fallback', () => {
    const result = historyFeatures(entry({ features: { mediaDecision: 'generate' }, hasLegacyMediaUrl: true }), 'Asia/Tokyo');
    expect(result.mediaDecision).toBe('generate');
  });

  it('falls back to library when there is a legacy media url and no explicit mediaDecision', () => {
    const result = historyFeatures(entry({ hasLegacyMediaUrl: true }), 'Asia/Tokyo');
    expect(result.mediaDecision).toBe('library');
  });

  it('falls back to none when there is no legacy media url and no explicit mediaDecision', () => {
    const result = historyFeatures(entry({ hasLegacyMediaUrl: false }), 'Asia/Tokyo');
    expect(result.mediaDecision).toBe('none');
  });

  it('derives postingHour as HH:00 in the given time zone', () => {
    const result = historyFeatures(entry({ publishedAt: '2026-08-20T00:00:00.000Z' }), 'Asia/Tokyo');
    expect(result.postingHour).toBe('09:00');
  });

  it('derives postingHour in a custom time zone', () => {
    const result = historyFeatures(entry({ publishedAt: '2026-08-20T00:00:00.000Z' }), 'America/New_York');
    expect(result.postingHour).toBe('20:00');
  });

  it('overwrites any pre-existing postingHour feature unconditionally', () => {
    const result = historyFeatures(
      entry({ features: { postingHour: '23:00' }, publishedAt: '2026-08-20T00:00:00.000Z' }),
      'Asia/Tokyo',
    );
    expect(result.postingHour).toBe('09:00');
  });

  it('does not derive postingHour when publishedAt is empty', () => {
    const result = historyFeatures(entry({ publishedAt: '' }), 'Asia/Tokyo');
    expect(result.postingHour).toBeUndefined();
  });

  it('copies through other feature dimensions unchanged', () => {
    const result = historyFeatures(entry({ features: { topic: 'gear', hook: 'ask' } }), 'Asia/Tokyo');
    expect(result.topic).toBe('gear');
    expect(result.hook).toBe('ask');
  });
});
