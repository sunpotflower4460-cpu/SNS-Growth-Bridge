import { describe, expect, it } from 'vitest';

import { rankPatterns } from './rank-patterns.js';
import type { LegacyFeatureStats } from './types.js';

function stat(n: number, lift: number) {
  return { n, averageScore: 50 + lift, lift, confidence: Math.min(1, n / 6) };
}

describe('rankPatterns', () => {
  it('excludes patterns below minSamplesPerPattern', () => {
    const featureStats: LegacyFeatureStats = { hook: { rare: stat(1, 10), common: stat(2, 5) } };
    const { preferred } = rankPatterns(featureStats, 2);
    expect(preferred.map((p) => p.value)).toEqual(['common']);
  });

  it('excludes lift === 0 from both preferred and avoid', () => {
    const featureStats: LegacyFeatureStats = { hook: { neutral: stat(3, 0), good: stat(3, 5), bad: stat(3, -5) } };
    const { preferred, avoid } = rankPatterns(featureStats, 2);
    expect(preferred.map((p) => p.value)).toEqual(['good']);
    expect(avoid.map((p) => p.value)).toEqual(['bad']);
  });

  it('sorts preferred by lift descending and caps at 8', () => {
    const values: Record<string, ReturnType<typeof stat>> = {};
    for (let i = 1; i <= 10; i += 1) {
      values[`v${String(i)}`] = stat(2, i);
    }
    const featureStats: LegacyFeatureStats = { topic: values };
    const { preferred } = rankPatterns(featureStats, 2);
    expect(preferred).toHaveLength(8);
    expect(preferred[0]?.value).toBe('v10');
    expect(preferred[7]?.value).toBe('v3');
  });

  it('sorts avoid by lift ascending (worst first) and caps at 6', () => {
    const values: Record<string, ReturnType<typeof stat>> = {};
    for (let i = 1; i <= 8; i += 1) {
      values[`v${String(i)}`] = stat(2, -i);
    }
    const featureStats: LegacyFeatureStats = { topic: values };
    const { avoid } = rankPatterns(featureStats, 2);
    expect(avoid).toHaveLength(6);
    expect(avoid[0]?.value).toBe('v8');
    expect(avoid[5]?.value).toBe('v3');
  });

  it('keeps FEATURE_DIMENSIONS order for tied lift (topic before hook)', () => {
    const featureStats: LegacyFeatureStats = {
      topic: { tied: stat(2, 5) },
      hook: { tied: stat(2, 5) },
    };
    const { preferred } = rankPatterns(featureStats, 2);
    expect(preferred.map((p) => p.dimension)).toEqual(['topic', 'hook']);
  });
});
