import { describe, expect, it } from 'vitest';

import { scoreSnapshot } from './score-snapshot.js';
import { parseMetricSnapshot } from '@sns-growth-bridge/contracts';
import { loadGolden } from './test-utils.js';

describe('confidence (SNS-AI parity)', () => {
  it('uses baselineCount 0 / 5 / 10+ with the frozen formula', () => {
    const empty = scoreSnapshot(
      parseMetricSnapshot((loadGolden('x-empty-baseline') as { target: unknown }).target),
      [],
    );
    expect(empty.baselineCount).toBe(0);

    const fivePeers = Array.from({ length: 5 }, (_, index) =>
      parseMetricSnapshot({
        ...((loadGolden('x-empty-baseline') as { target: unknown }).target as object),
        snapshotId: `snap_peer_${String(index)}`,
        postId: `post_peer_${String(index)}`,
        externalPostId: `ext_peer_${String(index)}`,
        metrics: { impressions: 1000, reposts: 10, bookmarks: 10, replies: 2, profileClicks: 5, urlClicks: 2 },
      }),
    );
    const withFive = scoreSnapshot(
      parseMetricSnapshot((loadGolden('x-empty-baseline') as { target: unknown }).target),
      fivePeers,
    );
    expect(withFive.baselineCount).toBe(5);

    const tenPeers = Array.from({ length: 12 }, (_, index) =>
      parseMetricSnapshot({
        ...((loadGolden('x-empty-baseline') as { target: unknown }).target as object),
        snapshotId: `snap_peer10_${String(index)}`,
        postId: `post_peer10_${String(index)}`,
        externalPostId: `ext_peer10_${String(index)}`,
        metrics: { impressions: 1000, reposts: 10, bookmarks: 10, replies: 2, profileClicks: 5, urlClicks: 2 },
      }),
    );
    const withTen = scoreSnapshot(
      parseMetricSnapshot((loadGolden('x-empty-baseline') as { target: unknown }).target),
      tenPeers,
    );
    expect(withTen.baselineCount).toBe(12);

    const exposure = 2000;
    const exposureConfidence = Math.min(1, Math.max(0, Math.log10(exposure + 1) / 4));
    expect(empty.confidence).toBe(Math.round((0 * 0.7 + exposureConfidence * 0.3) * 100) / 100);
    expect(withFive.confidence).toBe(Math.round((0.5 * 0.7 + exposureConfidence * 0.3) * 100) / 100);
    expect(withTen.confidence).toBe(Math.round((1 * 0.7 + exposureConfidence * 0.3) * 100) / 100);
  });
});
