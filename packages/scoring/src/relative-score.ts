import { clamp } from './math.js';

/**
 * SNS-AI `relativeScore`:
 * baseline <= 0 → value > 0 ? 65 : 50
 * value <= 0 → 15
 * else clamp(50 + 22 * log2(value / baseline), 0, 100)
 */
export function relativeScore(value: number, baseline: number): number {
  if (baseline <= 0) {
    return value > 0 ? 65 : 50;
  }
  if (value <= 0) {
    return 15;
  }
  return clamp(50 + 22 * Math.log2(value / baseline), 0, 100);
}
