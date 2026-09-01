import { describe, expect, it } from 'vitest';

import { median } from './median.js';

describe('median (SNS-AI parity)', () => {
  it('returns 0 for an empty list', () => {
    expect(median([])).toBe(0);
  });

  it('returns the middle value for an odd count', () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it('averages the two middle values for an even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('handles zeros', () => {
    expect(median([0, 0, 0])).toBe(0);
    expect(median([0, 10])).toBe(5);
  });

  it('handles decimals', () => {
    expect(median([0.1, 0.3, 0.2])).toBe(0.2);
  });

  it('drops non-finite values before sorting', () => {
    expect(median([1, Number.NaN, 3, Number.POSITIVE_INFINITY])).toBe(2);
  });
});
