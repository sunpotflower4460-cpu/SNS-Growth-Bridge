import { describe, expect, it } from 'vitest';

import { adaptSnsAiMetricSnapshot } from './metric.js';
import { AdapterReason } from './result.js';
import { CONTEXT, metricRow } from './test-utils.js';

describe('adaptSnsAiMetricSnapshot', () => {
  it('maps an X 24h snapshot and preserves likes as raw data', () => {
    const result = adaptSnsAiMetricSnapshot({ row: metricRow() }, CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.snapshotId).toBe(
      'sns-ai:metric:music-tools-x:ext_x_1:1440:2026-09-04T08:00:00.000Z',
    );
    expect(result.value.postId).toBe('sns-ai:music-tools-x:ext_x_1');
    expect(result.value.subject).toEqual({ accountId: 'music-tools-x' });
    expect(result.value.externalPostId).toBe('ext_x_1');
    expect(result.value.capturedAt).toBe('2026-09-04T08:00:00.000Z');
    expect(result.value.checkpointMinutes).toBe(1440);
    expect(result.value.metrics.likes).toBe(10);
    expect(result.value.metrics.impressions).toBe(2000);
    expect(result.value.metrics.reposts).toBe(20);
    expect(result.value.metrics.profileClicks).toBe(40);
    expect(result.value.metrics.urlClicks).toBe(16);
  });

  it('maps an X 1h checkpoint without restricting to the default five values', () => {
    const result = adaptSnsAiMetricSnapshot({ row: metricRow({ checkpointMinutes: 60 }) }, CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.checkpointMinutes).toBe(60);
  });

  it('maps X video metrics that exist on Canonical RawMetricVector', () => {
    const result = adaptSnsAiMetricSnapshot(
      {
        row: metricRow({
          metrics: { impressions: 100, videoViews: 80, playback100: 20, likes: 1 },
        }),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.metrics.videoViews).toBe(80);
    expect(result.value.metrics.playback100).toBe(20);
    expect(JSON.stringify(result.value.metrics)).not.toContain('playback25');
  });

  it('maps Instagram views, reach, saves, follows, profileVisits, and reelSkipRate', () => {
    const result = adaptSnsAiMetricSnapshot(
      {
        row: metricRow({
          platform: 'instagram',
          providerPostId: 'ext_ig_1',
          metrics: {
            views: 400,
            reach: 350,
            likes: 12,
            comments: 3,
            shares: 2,
            saved: 9,
            follows: 4,
            profileVisits: 7,
            reelSkipRate: 0.2,
            totalInteractions: 99,
            reelWatchTimeMs: 12000,
          },
        }),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.platform).toBe('instagram');
    expect(result.value.metrics.views).toBe(400);
    expect(result.value.metrics.reach).toBe(350);
    expect(result.value.metrics.saved).toBe(9);
    expect(result.value.metrics.follows).toBe(4);
    expect(result.value.metrics.profileVisits).toBe(7);
    expect(result.value.metrics.reelSkipRate).toBe(0.2);
    expect(result.value.metrics).not.toHaveProperty('totalInteractions');
    expect(result.value.metrics).not.toHaveProperty('reelWatchTimeMs');
  });

  it('strips unknown metric keys such as engagements', () => {
    const result = adaptSnsAiMetricSnapshot(
      { row: metricRow({ metrics: { impressions: 10, engagements: 99, playback25: 1 } }) },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.metrics).not.toHaveProperty('engagements');
    expect(result.value.metrics).not.toHaveProperty('playback25');
  });

  it('blocks empty account', () => {
    expect(adaptSnsAiMetricSnapshot({ row: metricRow({ account: '  ' }) }, CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: account`,
    });
  });

  it('blocks empty providerPostId', () => {
    expect(adaptSnsAiMetricSnapshot({ row: metricRow({ providerPostId: '' }) }, CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: providerPostId`,
    });
  });

  it('blocks negative counts', () => {
    expect(
      adaptSnsAiMetricSnapshot({ row: metricRow({ metrics: { impressions: -1 } }) }, CONTEXT),
    ).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidMetric}: impressions`,
    });
  });

  it('blocks NaN and Infinity', () => {
    expect(
      adaptSnsAiMetricSnapshot({ row: metricRow({ metrics: { impressions: Number.NaN } }) }, CONTEXT),
    ).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidMetric}: impressions`,
    });
    expect(
      adaptSnsAiMetricSnapshot({
        row: metricRow({ metrics: { impressions: Number.POSITIVE_INFINITY } }),
      }, CONTEXT),
    ).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidMetric}: impressions`,
    });
  });

  it('blocks invalid reelSkipRate', () => {
    expect(
      adaptSnsAiMetricSnapshot({ row: metricRow({ metrics: { reelSkipRate: 1.2 } }) }, CONTEXT),
    ).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidMetric}: reelSkipRate`,
    });
  });

  it('blocks invalid collectedAt', () => {
    expect(adaptSnsAiMetricSnapshot({ row: metricRow({ collectedAt: 'yesterday' }) }, CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: collectedAt`,
    });
  });

  it('blocks invalid checkpoint without restricting to the default five values', () => {
    expect(adaptSnsAiMetricSnapshot({ row: metricRow({ checkpointMinutes: 0 }) }, CONTEXT)).toEqual({
      status: 'blocked',
      reason: AdapterReason.invalidCheckpoint,
    });
    expect(adaptSnsAiMetricSnapshot({ row: metricRow({ checkpointMinutes: 90 }) }, CONTEXT).status).toBe(
      'mapped',
    );
  });

  it('blocks unsupported platform', () => {
    expect(adaptSnsAiMetricSnapshot({ row: metricRow({ platform: 'line' }) }, CONTEXT)).toEqual({
      status: 'blocked',
      reason: AdapterReason.unknownPlatform,
    });
  });

  it('does not invent creatorId or workspaceId', () => {
    const result = adaptSnsAiMetricSnapshot({ row: metricRow() }, CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.subject.creatorId).toBeUndefined();
    expect(result.value.subject.workspaceId).toBeUndefined();
  });

  it('does not mutate input', () => {
    const input = { row: metricRow() };
    const before = structuredClone(input);
    adaptSnsAiMetricSnapshot(input, CONTEXT);
    expect(input).toEqual(before);
  });

  it('is deterministic', () => {
    const input = { row: metricRow() };
    expect(adaptSnsAiMetricSnapshot(input, CONTEXT)).toEqual(adaptSnsAiMetricSnapshot(input, CONTEXT));
  });
});
