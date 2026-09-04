import { parseMetricSnapshot, type MetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { buildStrategyParity } from './build-strategy.js';
import { DEFAULT_EXPLORE_RATE, DEFAULT_TIMEZONE, STRATEGY_GUARDRAIL } from './config.js';
import { historyFeatures } from './history-features.js';
import { latestSnapshots } from './latest-snapshots.js';
import { PACKAGE_PHASE, STRATEGY_VERSION } from './version.js';
import { loadGolden } from './test-utils.js';
import type { StrategyParityResult, StrategyPostEvidence } from './types.js';

const META = {
  schemaVersion: 1 as const,
  producer: 'sns-ai' as const,
  producedAt: '2026-09-01T12:00:00.000Z',
  traceId: 'trace_strategy_unit',
};

function snapshot(partial: Partial<MetricSnapshot> & { externalPostId: string; metrics: MetricSnapshot['metrics'] }): MetricSnapshot {
  return parseMetricSnapshot({
    meta: META,
    snapshotId: partial.snapshotId ?? `snap_${partial.externalPostId}`,
    postId: partial.postId ?? `post_${partial.externalPostId}`,
    subject: partial.subject ?? { accountId: 'acct_example_x' },
    platform: partial.platform ?? 'x',
    externalPostId: partial.externalPostId,
    capturedAt: partial.capturedAt ?? '2026-08-20T00:00:00.000Z',
    checkpointMinutes: partial.checkpointMinutes ?? 1440,
    metrics: partial.metrics,
  });
}

describe('strategy invariants', () => {
  it('is Phase 4 sns-ai-learn-parity-v1', () => {
    expect(PACKAGE_PHASE).toBe(4);
    expect(STRATEGY_VERSION).toBe('sns-ai-learn-parity-v1');
  });

  it('keeps the SNS-AI guardrail verbatim', () => {
    expect(STRATEGY_GUARDRAIL).toBe(
      'Treat these as recent evidence, not identity. Never override profile, safety rules, or explicit human instructions.',
    );
  });

  it('does not weight feature averages by scorer confidence', () => {
    const fixture = loadGolden('min-samples-filter') as {
      accountId: string;
      now: string;
      posts: StrategyPostEvidence[];
      snapshots: unknown[];
      expected: StrategyParityResult;
    };
    const actual = buildStrategyParity({
      accountId: fixture.accountId,
      now: fixture.now,
      posts: fixture.posts,
      snapshots: fixture.snapshots.map((row) => parseMetricSnapshot(row)),
    });
    const story = actual.parity.featureStats.hook['story'];
    expect(story).toBeDefined();
    expect(story?.n).toBe(2);
    expect(story?.averageScore).toBe(fixture.expected.featureStats.hook['story']?.averageScore);
  });

  it('keeps n=1 patterns in featureStats but not in preferred or avoid', () => {
    const fixture = loadGolden('min-samples-filter') as {
      expected: StrategyParityResult;
    };
    expect(fixture.expected.featureStats.hook['question']?.n).toBe(1);
    expect(fixture.expected.preferred.some((pattern) => pattern.value === 'question')).toBe(false);
    expect(fixture.expected.avoid.some((pattern) => pattern.value === 'question')).toBe(false);
  });

  it('excludes zero-lift patterns from preferred and avoid', () => {
    const fixture = loadGolden('zero-lift-excluded') as { expected: StrategyParityResult };
    expect(fixture.expected.sampleSize).toBe(2);
    expect(fixture.expected.preferred).toEqual([]);
    expect(fixture.expected.avoid).toEqual([]);
    expect(fixture.expected.featureStats.hook['story']?.lift).toBe(0);
  });

  it('caps preferred at 8 and avoid at 6', () => {
    const preferred = loadGolden('preferred-cap-8') as { expected: StrategyParityResult };
    const avoid = loadGolden('avoid-cap-6') as { expected: StrategyParityResult };
    expect(preferred.expected.preferred).toHaveLength(8);
    expect(preferred.expected.preferred.every((pattern) => pattern.lift > 0)).toBe(true);
    expect(avoid.expected.avoid).toHaveLength(6);
    expect(avoid.expected.avoid.every((pattern) => pattern.lift < 0)).toBe(true);
  });

  it('uses feature confidence n/6, not fullConfidencePosts', () => {
    const fixture = loadGolden('feature-confidence-n-over-6') as { expected: StrategyParityResult };
    expect(fixture.expected.featureStats.hook['story']?.n).toBe(3);
    expect(fixture.expected.featureStats.hook['story']?.confidence).toBe(0.5);
    expect(fixture.expected.confidence).toBe(0.25);
  });

  it('uses strategy confidence sampleSize/20 by default', () => {
    const fixture = loadGolden('strategy-confidence-sample-size-over-20') as { expected: StrategyParityResult };
    expect(fixture.expected.sampleSize).toBe(4);
    expect(fixture.expected.confidence).toBe(0.2);
  });

  it('copies exploreRate through without executing explore/exploit', () => {
    const fixture = loadGolden('custom-explore-rate') as { expected: StrategyParityResult };
    expect(fixture.expected.exploreRate).toBe(0.5);
    const defaults = loadGolden('no-samples') as { expected: StrategyParityResult };
    expect(defaults.expected.exploreRate).toBe(DEFAULT_EXPLORE_RATE);
  });
});

describe('latest snapshot then mature filter', () => {
  it('drops a post whose latest captured snapshot is immature even if an earlier snapshot was mature', () => {
    const fixture = loadGolden('latest-then-immature-drops-post') as { expected: StrategyParityResult };
    expect(fixture.expected.sampleSize).toBe(1);
    expect(fixture.expected.featureStats.topic['news']).toBeDefined();
    expect(fixture.expected.featureStats.topic['growth']).toBeUndefined();
  });

  it('selects the newest capturedAt, not the maximum checkpoint', () => {
    const rows = [
      snapshot({
        externalPostId: 'p1',
        snapshotId: 'a',
        capturedAt: '2026-08-18T00:00:00.000Z',
        checkpointMinutes: 1440,
        metrics: { impressions: 1 },
      }),
      snapshot({
        externalPostId: 'p1',
        snapshotId: 'b',
        capturedAt: '2026-08-21T00:00:00.000Z',
        checkpointMinutes: 360,
        metrics: { impressions: 9 },
      }),
    ];
    const latest = latestSnapshots(rows);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.snapshotId).toBe('b');
    expect(latest[0]?.checkpointMinutes).toBe(360);
  });
});

describe('historyFeatures', () => {
  const base: StrategyPostEvidence = {
    accountId: 'acct_example_x',
    externalPostId: 'p1',
    publishedAt: '2026-08-15T00:30:00.000Z',
    features: {},
    hasLegacyMediaUrl: false,
  };

  it('derives postingHour in Asia/Tokyo as HH:00', () => {
    const features = historyFeatures(base, DEFAULT_TIMEZONE);
    expect(features.postingHour).toBe('09:00');
  });

  it('derives postingHour in a custom timezone', () => {
    const features = historyFeatures(base, 'America/New_York');
    expect(features.postingHour).toBe('20:00');
  });

  it('preserves an existing mediaDecision', () => {
    const features = historyFeatures(
      { ...base, features: { mediaDecision: 'search' }, hasLegacyMediaUrl: true },
      DEFAULT_TIMEZONE,
    );
    expect(features.mediaDecision).toBe('search');
  });

  it('falls back to library when legacy mediaUrl is present', () => {
    expect(historyFeatures({ ...base, hasLegacyMediaUrl: true }).mediaDecision).toBe('library');
  });

  it('falls back to none when legacy mediaUrl is absent', () => {
    expect(historyFeatures({ ...base, hasLegacyMediaUrl: false }).mediaDecision).toBe('none');
  });
});

describe('history map overwrite', () => {
  it('uses the later history entry for the same externalPostId', () => {
    const fixture = loadGolden('history-map-overwrite') as { expected: StrategyParityResult };
    expect(fixture.expected.featureStats.hook['question']).toBeDefined();
    expect(fixture.expected.featureStats.topic['second']).toBeDefined();
    expect(fixture.expected.featureStats.hook['story']?.n).toBe(1);
    expect(fixture.expected.featureStats.topic['first']).toBeUndefined();
  });
});
