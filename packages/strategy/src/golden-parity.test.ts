import { parseMetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { buildStrategyParity } from './build-strategy.js';
import { loadGolden } from './test-utils.js';
import type { StrategyLearningConfig, StrategyParityResult, StrategyPostEvidence } from './types.js';

const GOLDEN_NAMES = [
  'no-samples',
  'one-sample',
  'normal-multi-sample',
  'window-exclusion',
  'wrong-account-exclusion',
  'missing-external-post-id-exclusion',
  'latest-snapshot-selection',
  'latest-immature-drops-mature-history',
  'mature-boundary-inclusion',
  'same-feature-grouped',
  'min-samples-filter',
  'preferred-positive-lift',
  'avoid-negative-lift',
  'zero-lift-excluded',
  'preferred-cap-8',
  'avoid-cap-6',
  'feature-confidence-n-over-6',
  'overall-score-rounding',
  'strategy-confidence-sample-size-over-20',
  'custom-full-confidence-posts',
  'custom-explore-rate',
  'custom-strategy-window-days',
  'custom-mature-checkpoint-minutes',
  'posting-hour-asia-tokyo',
  'posting-hour-custom-timezone',
  'media-decision-existing-preserved',
  'media-decision-fallback-library',
  'media-decision-fallback-none',
  'score-weight-override',
  'tie-stable-sort',
] as const;

interface GoldenCase {
  name: string;
  accountId: string;
  now: string;
  config: StrategyLearningConfig;
  history: StrategyPostEvidence[];
  snapshots: unknown[];
  expected: StrategyParityResult;
}

function readCase(name: string): GoldenCase {
  return loadGolden(name) as GoldenCase;
}

describe('golden SNS-AI buildStrategy() parity', () => {
  it.each(GOLDEN_NAMES)('%s matches frozen SNS-AI expected output exactly', (name) => {
    const fixture = readCase(name);
    const snapshots = fixture.snapshots.map((snapshot) => parseMetricSnapshot(snapshot));
    const { parity } = buildStrategyParity({
      accountId: fixture.accountId,
      history: fixture.history,
      snapshots,
      now: new Date(fixture.now),
      config: fixture.config,
    });
    expect(parity).toEqual(fixture.expected);
  });

  it('preferred and avoid stay capped at 8 and 6', () => {
    const capPreferred = readCase('preferred-cap-8');
    expect(capPreferred.expected.preferred.length).toBe(8);
    const capAvoid = readCase('avoid-cap-6');
    expect(capAvoid.expected.avoid.length).toBe(6);
  });

  it('n=1 patterns are excluded from ranked lists but retained in featureStats', () => {
    const fixture = readCase('min-samples-filter');
    expect(fixture.expected.featureStats.hook?.['rare']?.n).toBe(1);
    expect(fixture.expected.preferred.some((pattern) => pattern.value === 'rare')).toBe(false);
    expect(fixture.expected.avoid.some((pattern) => pattern.value === 'rare')).toBe(false);
    expect(fixture.expected.preferred.some((pattern) => pattern.value === 'common')).toBe(true);
  });

  it('a dimension shared identically by every sample gets lift 0 and is excluded from both lists', () => {
    const fixture = readCase('zero-lift-excluded');
    expect(fixture.expected.featureStats.cta?.['soft']?.lift).toBe(0);
    expect(fixture.expected.preferred.some((pattern) => pattern.dimension === 'cta')).toBe(false);
    expect(fixture.expected.avoid.some((pattern) => pattern.dimension === 'cta')).toBe(false);
  });

  it('the critical latest-immature-drops-mature quirk drops the post entirely', () => {
    const fixture = readCase('latest-immature-drops-mature-history');
    expect(fixture.expected.sampleSize).toBe(1);
  });

  it('tied lift keeps FEATURE_DIMENSIONS insertion order (topic before hook)', () => {
    const fixture = readCase('tie-stable-sort');
    const preferred = fixture.expected.preferred;
    expect(preferred[0]?.dimension).toBe('topic');
    expect(preferred[1]?.dimension).toBe('hook');
    expect(preferred[0]?.lift).toBe(preferred[1]?.lift);
    const avoid = fixture.expected.avoid;
    expect(avoid[0]?.dimension).toBe('topic');
    expect(avoid[1]?.dimension).toBe('hook');
    expect(avoid[0]?.lift).toBe(avoid[1]?.lift);
  });
});
