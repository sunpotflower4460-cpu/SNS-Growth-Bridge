import { describe, expect, it } from 'vitest';

import { metricVectorFromRaw } from './metric-vector.js';

describe('metricVectorFromRaw (SNS-AI parity)', () => {
  it('prefers impressions over reach and views (first truthy, not max)', () => {
    const vector = metricVectorFromRaw({ impressions: 10, reach: 999, views: 888 });
    expect(vector.exposure).toBe(10);
  });

  it('falls back to reach when impressions is missing or 0', () => {
    expect(metricVectorFromRaw({ reach: 15, views: 3 }).exposure).toBe(15);
    expect(metricVectorFromRaw({ impressions: 0, reach: 15, views: 3 }).exposure).toBe(15);
  });

  it('falls back to views then 0', () => {
    expect(metricVectorFromRaw({ views: 7 }).exposure).toBe(7);
    expect(metricVectorFromRaw({}).exposure).toBe(0);
  });

  it('aggregates share, save, conversation, and profile numerators', () => {
    const vector = metricVectorFromRaw({
      impressions: 100,
      reposts: 1,
      quotes: 2,
      shares: 3,
      bookmarks: 4,
      saved: 5,
      replies: 6,
      comments: 7,
      profileClicks: 8,
      profileVisits: 9,
      urlClicks: 10,
      follows: 11,
    });
    expect(vector.shareRate).toBe(0.06);
    expect(vector.saveRate).toBe(0.09);
    expect(vector.conversationRate).toBe(0.13);
    expect(vector.profileRate).toBe(0.17);
    expect(vector.clickRate).toBe(0.1);
    expect(vector.followRate).toBe(0.11);
  });

  it('returns 0 rates when exposure is 0', () => {
    const vector = metricVectorFromRaw({ impressions: 0, reposts: 9 });
    expect(vector.shareRate).toBe(0);
  });

  it('computes watchQuality from playback100 / videoViews', () => {
    const vector = metricVectorFromRaw({ videoViews: 100, playback100: 40 });
    expect(vector.watchQuality).toBe(0.4);
  });

  it('computes watchQuality from reelSkipRate when that path is higher', () => {
    const vector = metricVectorFromRaw({ videoViews: 100, playback100: 10, reelSkipRate: 0.2 });
    expect(vector.watchQuality).toBe(0.8);
  });

  it('ignores likes', () => {
    const without = metricVectorFromRaw({ impressions: 50, reposts: 5 });
    const withLikes = metricVectorFromRaw({ impressions: 50, reposts: 5, likes: 9999 });
    expect(withLikes).toEqual(without);
  });
});
