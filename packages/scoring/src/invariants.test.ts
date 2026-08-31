import { parseMetricSnapshot, type MetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { ScoringInputError } from './errors.js';
import { selectBaselinePeers } from './baseline.js';
import { scoreSnapshot, toPerformanceScore } from './score-snapshot.js';
import { PACKAGE_PHASE, SCORER_VERSION } from './version.js';
import { defaultWeightsForPlatform } from './weights.js';
import { loadGolden } from './test-utils.js';

function asSnapshot(value: unknown): MetricSnapshot {
  return parseMetricSnapshot(value);
}

describe('scoring invariants', () => {
  it('is Phase 3 sns-ai-parity-v1', () => {
    expect(PACKAGE_PHASE).toBe(3);
    expect(SCORER_VERSION).toBe('sns-ai-parity-v1');
  });

  it('does not change score when only likes change', () => {
    const fixture = loadGolden('x-normal') as { target: unknown; peers: unknown[] };
    const target = asSnapshot(fixture.target);
    const peers = fixture.peers.map(asSnapshot);
    const low = scoreSnapshot(target, peers);
    const high = scoreSnapshot(
      { ...target, metrics: { ...target.metrics, likes: 100000 } },
      peers,
    );
    expect(high.score).toBe(low.score);
    expect(high.vector).toEqual(low.vector);
    expect(high.baseline).toEqual(low.baseline);
    expect(high.confidence).toBe(low.confidence);
  });

  it('ignores a different account when building baseline', () => {
    const fixture = loadGolden('x-normal') as { target: unknown; peers: unknown[] };
    const target = asSnapshot(fixture.target);
    const peers = fixture.peers.map(asSnapshot);
    const extra: MetricSnapshot = {
      ...target,
      snapshotId: 'snap_other_acct',
      postId: 'post_other_acct',
      subject: { accountId: 'acct_other' },
      externalPostId: 'ext_other_acct_inv',
      metrics: { impressions: 99999, reposts: 500, bookmarks: 500, replies: 500, profileClicks: 500, urlClicks: 500 },
    };
    const without = scoreSnapshot(target, peers);
    const withExtra = scoreSnapshot(target, [...peers, extra]);
    expect(withExtra.baseline).toEqual(without.baseline);
    expect(withExtra.baselineCount).toBe(without.baselineCount);
  });

  it('ignores a different platform when building baseline', () => {
    const fixture = loadGolden('x-normal') as { target: unknown; peers: unknown[] };
    const target = asSnapshot(fixture.target);
    const peers = fixture.peers.map(asSnapshot);
    const extra: MetricSnapshot = {
      ...target,
      snapshotId: 'snap_ig',
      postId: 'post_ig',
      platform: 'instagram',
      externalPostId: 'ext_ig_inv',
      metrics: { impressions: 88888, shares: 400, saved: 400, comments: 400, follows: 40 },
    };
    const without = scoreSnapshot(target, peers);
    const withExtra = scoreSnapshot(target, [...peers, extra]);
    expect(withExtra.baseline).toEqual(without.baseline);
  });

  it('excludes self by externalPostId, not postId', () => {
    const fixture = loadGolden('x-empty-baseline') as { target: unknown };
    const target = asSnapshot(fixture.target);
    const clone: MetricSnapshot = {
      ...target,
      snapshotId: 'snap_clone',
      postId: 'post_different_internal_id',
      externalPostId: target.externalPostId,
    };
    expect(selectBaselinePeers(target, [clone])).toEqual([]);
    expect(scoreSnapshot(target, [clone]).baselineCount).toBe(0);
  });

  it('keeps score in 0..100 and confidence in 0..1', () => {
    const fixture = loadGolden('x-high-performance') as { target: unknown; peers: unknown[] };
    const result = scoreSnapshot(asSnapshot(fixture.target), fixture.peers.map(asSnapshot));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.baselineCount).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic for the same input', () => {
    const fixture = loadGolden('instagram-normal') as { target: unknown; peers: unknown[] };
    const target = asSnapshot(fixture.target);
    const peers = fixture.peers.map(asSnapshot);
    expect(scoreSnapshot(target, peers)).toEqual(scoreSnapshot(target, peers));
  });

  it('fails closed without subject.accountId', () => {
    const fixture = loadGolden('x-empty-baseline') as { target: unknown };
    const target = asSnapshot(fixture.target);
    const invalid = { ...target, subject: { workspaceId: 'ws_fixture_1' } };
    expect(() => scoreSnapshot(invalid)).toThrow(ScoringInputError);
  });

  it('maps youtube to X default weights', () => {
    expect(defaultWeightsForPlatform('youtube')).toEqual(defaultWeightsForPlatform('x'));
  });

  it('converts to PerformanceScore', () => {
    const fixture = loadGolden('x-normal') as { target: unknown; peers: unknown[] };
    const target = asSnapshot(fixture.target);
    const scored = scoreSnapshot(target, fixture.peers.map(asSnapshot));
    const performance = toPerformanceScore(target.postId, scored);
    expect(performance.postId).toBe(target.postId);
    expect(performance.score).toBe(scored.score);
    expect(performance.baselineCount).toBe(scored.baselineCount);
  });
});
