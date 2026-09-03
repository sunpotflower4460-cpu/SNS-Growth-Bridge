import type { MetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { latestSnapshots } from './latest-snapshots.js';

const META = { schemaVersion: 1 as const, producer: 'sns-ai' as const, producedAt: '2026-08-01T00:00:00.000Z', traceId: 'trace' };

function snap(overrides: Partial<MetricSnapshot> & { accountId: string; externalPostId: string; capturedAt: string }): MetricSnapshot {
  const { accountId, externalPostId, capturedAt, ...rest } = overrides;
  return {
    meta: META,
    snapshotId: `snap_${externalPostId}_${capturedAt}`,
    postId: `post_${externalPostId}`,
    subject: { accountId },
    platform: 'x',
    externalPostId,
    capturedAt,
    checkpointMinutes: 1440,
    metrics: {},
    ...rest,
  };
}

describe('latestSnapshots', () => {
  it('keeps the row with the newest capturedAt per account+externalPostId', () => {
    const older = snap({ accountId: 'acct_1', externalPostId: 'p1', capturedAt: '2026-08-01T00:00:00.000Z' });
    const newer = snap({ accountId: 'acct_1', externalPostId: 'p1', capturedAt: '2026-08-05T00:00:00.000Z' });
    expect(latestSnapshots([older, newer])).toEqual([newer]);
    expect(latestSnapshots([newer, older])).toEqual([newer]);
  });

  it('keeps the first-encountered row on an exact capturedAt tie', () => {
    const first = snap({ accountId: 'acct_1', externalPostId: 'p1', capturedAt: '2026-08-01T00:00:00.000Z', snapshotId: 'first' });
    const second = snap({ accountId: 'acct_1', externalPostId: 'p1', capturedAt: '2026-08-01T00:00:00.000Z', snapshotId: 'second' });
    expect(latestSnapshots([first, second])).toEqual([first]);
  });

  it('keeps separate posts and separate accounts independent', () => {
    const a = snap({ accountId: 'acct_1', externalPostId: 'p1', capturedAt: '2026-08-01T00:00:00.000Z' });
    const b = snap({ accountId: 'acct_1', externalPostId: 'p2', capturedAt: '2026-08-01T00:00:00.000Z' });
    const c = snap({ accountId: 'acct_2', externalPostId: 'p1', capturedAt: '2026-08-01T00:00:00.000Z' });
    expect(latestSnapshots([a, b, c])).toHaveLength(3);
  });

  it('is not the same as picking the highest checkpointMinutes', () => {
    const mature = snap({
      accountId: 'acct_1',
      externalPostId: 'p1',
      capturedAt: '2026-08-01T00:00:00.000Z',
      checkpointMinutes: 1440,
    });
    const immatureButNewer = snap({
      accountId: 'acct_1',
      externalPostId: 'p1',
      capturedAt: '2026-08-05T00:00:00.000Z',
      checkpointMinutes: 60,
    });
    expect(latestSnapshots([mature, immatureButNewer])).toEqual([immatureButNewer]);
  });
});
