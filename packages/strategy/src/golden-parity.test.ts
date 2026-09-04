import { parseMetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { buildStrategyParity } from './build-strategy.js';
import type { StrategyLearningConfig, StrategyParityResult, StrategyPostEvidence } from './types.js';
import { GOLDEN_NAMES, loadGolden } from './test-utils.js';

interface GoldenCase {
  name: string;
  accountId: string;
  now: string;
  config: StrategyLearningConfig;
  posts: StrategyPostEvidence[];
  snapshots: unknown[];
  expected: StrategyParityResult;
}

function readCase(name: string): GoldenCase {
  return loadGolden(name) as GoldenCase;
}

describe('golden SNS-AI buildStrategy parity', () => {
  it.each(GOLDEN_NAMES)('%s matches frozen SNS-AI expected output exactly', (name) => {
    const fixture = readCase(name);
    const actual = buildStrategyParity({
      accountId: fixture.accountId,
      now: fixture.now,
      posts: fixture.posts,
      snapshots: fixture.snapshots.map((row) => parseMetricSnapshot(row)),
      config: fixture.config,
    });
    expect(actual.parity).toEqual(fixture.expected);
  });
});
