import { parseMetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { buildStrategyParity } from './build-strategy.js';
import { loadGolden } from './test-utils.js';
import { PACKAGE_PHASE, PARITY_TARGET_SHA, STRATEGY_VERSION } from './version.js';
import type { StrategyLearningConfig, StrategyPostEvidence } from './types.js';

interface GoldenCase {
  accountId: string;
  now: string;
  config: StrategyLearningConfig;
  history: StrategyPostEvidence[];
  snapshots: unknown[];
}

function readCase(name: string): GoldenCase {
  return loadGolden(name) as GoldenCase;
}

function run(name: string) {
  const fixture = readCase(name);
  return buildStrategyParity({
    accountId: fixture.accountId,
    history: fixture.history,
    snapshots: fixture.snapshots.map((snapshot) => parseMetricSnapshot(snapshot)),
    now: new Date(fixture.now),
    config: fixture.config,
  });
}

describe('strategy package invariants', () => {
  it('is Phase 4 sns-ai-learn-parity-v1', () => {
    expect(PACKAGE_PHASE).toBe(4);
    expect(STRATEGY_VERSION).toBe('sns-ai-learn-parity-v1');
    expect(PARITY_TARGET_SHA).toBe('914c70ee4666015f93603eef9a2f3dd9a1a7de08');
  });

  it('is deterministic for the same input', () => {
    const first = run('normal-multi-sample');
    const second = run('normal-multi-sample');
    expect(first.parity).toEqual(second.parity);
  });

  it('does not clamp exploreRate (SNS-AI copies it through as-is)', () => {
    const { parity } = run('custom-explore-rate');
    expect(parity.exploreRate).toBe(0.35);
  });

  it('overallScore stays in 0..100 and confidence in 0..1', () => {
    const { parity } = run('normal-multi-sample');
    expect(parity.overallScore).toBeGreaterThanOrEqual(0);
    expect(parity.overallScore).toBeLessThanOrEqual(100);
    expect(parity.confidence).toBeGreaterThanOrEqual(0);
    expect(parity.confidence).toBeLessThanOrEqual(1);
  });

  it('does not exceed preferred cap 8 / avoid cap 6 regardless of candidate count', () => {
    const capPreferred = run('preferred-cap-8');
    expect(capPreferred.parity.preferred.length).toBeLessThanOrEqual(8);
    const capAvoid = run('avoid-cap-6');
    expect(capAvoid.parity.avoid.length).toBeLessThanOrEqual(6);
  });

});
