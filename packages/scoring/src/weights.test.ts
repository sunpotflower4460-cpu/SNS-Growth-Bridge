import { describe, expect, it } from 'vitest';

import { clamp, safeRate } from './math.js';
import { defaultWeightsForPlatform, resolveWeights } from './weights.js';

describe('weights and helpers', () => {
  it('keeps X and Instagram weights asymmetric and summing to 1', () => {
    const x = defaultWeightsForPlatform('x');
    const ig = defaultWeightsForPlatform('instagram');
    expect(Object.values(x).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
    expect(Object.values(ig).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
    expect(x.profileRate).toBe(0.15);
    expect(x.watchQuality).toBeUndefined();
    expect(ig.watchQuality).toBe(0.15);
    expect(ig.profileRate).toBeUndefined();
  });

  it('merges overrides on top of platform defaults', () => {
    const resolved = resolveWeights('x', { exposure: 0.9 });
    expect(resolved.exposure).toBe(0.9);
    expect(resolved.shareRate).toBe(0.25);
  });

  it('safeRate is 0 when exposure is 0', () => {
    expect(safeRate(10, 0)).toBe(0);
    expect(safeRate(10, 10)).toBe(1);
  });

  it('clamp bounds values', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});
