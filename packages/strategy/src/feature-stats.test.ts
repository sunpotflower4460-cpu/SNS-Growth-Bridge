import { describe, expect, it } from 'vitest';

import { computeFeatureStats } from './feature-stats.js';
import { FEATURE_DIMENSIONS } from './types.js';
import type { StrategySample } from './types.js';

function sample(overrides: Partial<StrategySample>): StrategySample {
  return {
    externalPostId: 'p1',
    score: 50,
    scoreConfidence: 0.5,
    features: {},
    ...overrides,
  };
}

describe('computeFeatureStats', () => {
  it('emits every FEATURE_DIMENSIONS key even with zero samples', () => {
    const { featureStats } = computeFeatureStats([], 50);
    for (const dimension of FEATURE_DIMENSIONS) {
      expect(featureStats[dimension]).toEqual({});
    }
  });

  it('skips blank/whitespace feature values', () => {
    const samples = [
      sample({ externalPostId: 'p1', features: { hook: '  ' } }),
      sample({ externalPostId: 'p2', features: {} }),
    ];
    const { featureStats } = computeFeatureStats(samples, 50);
    expect(featureStats.hook).toEqual({});
  });

  it('groups by trimmed value and computes n / averageScore / lift / confidence with n/6 denominator', () => {
    const samples = [
      sample({ externalPostId: 'p1', score: 80, features: { hook: 'ask ' } }),
      sample({ externalPostId: 'p2', score: 90, features: { hook: ' ask' } }),
      sample({ externalPostId: 'p3', score: 20, features: { hook: 'tell' } }),
    ];
    const overall = (80 + 90 + 20) / 3;
    const { featureStats, patternEvidence } = computeFeatureStats(samples, overall);
    expect(featureStats.hook?.['ask']).toEqual({
      n: 2,
      averageScore: Math.round(((80 + 90) / 2) * 10) / 10,
      lift: Math.round(((80 + 90) / 2 - overall) * 10) / 10,
      confidence: Math.round((2 / 6) * 100) / 100,
    });
    const askEvidence = patternEvidence.find((row) => row.dimension === 'hook' && row.value === 'ask');
    expect(askEvidence?.externalPostIds).toEqual(['p1', 'p2']);
  });

  it('clamps confidence at 1 once n reaches 6', () => {
    const samples = Array.from({ length: 8 }, (_, index) =>
      sample({ externalPostId: `p${String(index)}`, score: 50, features: { hook: 'steady' } }),
    );
    const { featureStats } = computeFeatureStats(samples, 50);
    expect(featureStats.hook?.['steady']?.confidence).toBe(1);
  });

  it('preserves first-encountered insertion order across groups', () => {
    const samples = [
      sample({ externalPostId: 'p1', features: { hook: 'b' } }),
      sample({ externalPostId: 'p2', features: { hook: 'a' } }),
      sample({ externalPostId: 'p3', features: { hook: 'b' } }),
    ];
    const { featureStats } = computeFeatureStats(samples, 50);
    expect(Object.keys(featureStats.hook ?? {})).toEqual(['b', 'a']);
  });
});
