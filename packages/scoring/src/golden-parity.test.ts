import { parseMetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { scoreSnapshot } from './score-snapshot.js';
import { loadGolden } from './test-utils.js';

const GOLDEN_NAMES = [
  'x-empty-baseline',
  'x-normal',
  'x-high-performance',
  'x-low-performance',
  'instagram-normal',
  'instagram-watch-quality',
  'same-checkpoint-baseline',
  'fallback-checkpoint-baseline',
  'likes-ignored',
  'reach-fallback',
  'views-fallback',
  'exposure-zero',
  'youtube-x-weight-fallback',
  'weight-override',
  'zero-weight-total',
] as const;

interface GoldenCase {
  name: string;
  target: unknown;
  peers: unknown[];
  weightOverride: Record<string, number>;
  expected: ReturnType<typeof scoreSnapshot>;
}

function readCase(name: string): GoldenCase {
  return loadGolden(name) as GoldenCase;
}

describe('golden SNS-AI scorer parity', () => {
  it.each(GOLDEN_NAMES)('%s matches frozen SNS-AI expected output exactly', (name) => {
    const fixture = readCase(name);
    const target = parseMetricSnapshot(fixture.target);
    const peers = fixture.peers.map((peer) => parseMetricSnapshot(peer));
    const actual = scoreSnapshot(target, peers, fixture.weightOverride);
    expect(actual).toEqual(fixture.expected);
  });

  it('likes-only change matches x-normal expected output', () => {
    const normal = readCase('x-normal');
    const likes = readCase('likes-ignored');
    expect(likes.target).toMatchObject({ metrics: { likes: 100000 } });
    expect(likes.expected).toEqual(normal.expected);
  });
});
