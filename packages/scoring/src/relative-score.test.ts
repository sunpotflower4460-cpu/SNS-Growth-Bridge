import { describe, expect, it } from 'vitest';

import { relativeScore } from './relative-score.js';

describe('relativeScore (SNS-AI parity)', () => {
  it('returns 50 when value and baseline are 0', () => {
    expect(relativeScore(0, 0)).toBe(50);
  });

  it('returns 65 when value > 0 and baseline is 0', () => {
    expect(relativeScore(1, 0)).toBe(65);
  });

  it('returns 15 when value is 0 and baseline > 0', () => {
    expect(relativeScore(0, 10)).toBe(15);
  });

  it('returns 50 when value equals baseline', () => {
    expect(relativeScore(8, 8)).toBe(50);
  });

  it('returns 72 when value is 2x baseline', () => {
    expect(relativeScore(20, 10)).toBe(72);
  });

  it('returns 28 when value is 0.5x baseline', () => {
    expect(relativeScore(5, 10)).toBe(28);
  });

  it('clamps high ratios to 100', () => {
    expect(relativeScore(1024, 1)).toBe(100);
  });

  it('clamps low ratios to 0', () => {
    expect(relativeScore(1, 1024)).toBe(0);
  });
});
