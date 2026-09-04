import { parseGrowthStrategySnapshot, parseMetricSnapshot } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { buildStrategyParity } from './build-strategy.js';
import { projectToGrowthStrategySnapshot } from './canonical-projection.js';
import { DEFAULT_MATURE_CHECKPOINT_MINUTES, STRATEGY_GUARDRAIL } from './config.js';
import { STRATEGY_VERSION } from './version.js';
import { loadGolden } from './test-utils.js';
import type { StrategyLearningConfig, StrategyPostEvidence } from './types.js';

const META = {
  schemaVersion: 1 as const,
  producer: 'sns-growth-bridge' as const,
  producedAt: '2026-09-01T12:00:00.000Z',
  traceId: 'trace_strategy_projection',
};

describe('canonical projection', () => {
  it('marks sampleSize 0 as insufficient-evidence without changing legacy overallScore 50', () => {
    const fixture = loadGolden('no-samples') as {
      accountId: string;
      now: string;
      posts: StrategyPostEvidence[];
      snapshots: unknown[];
      config: StrategyLearningConfig;
    };
    const { parity, patternEvidence } = buildStrategyParity({
      accountId: fixture.accountId,
      now: fixture.now,
      posts: fixture.posts,
      snapshots: fixture.snapshots.map((row) => parseMetricSnapshot(row)),
      config: fixture.config,
    });
    expect(parity.sampleSize).toBe(0);
    expect(parity.overallScore).toBe(50);
    expect(parity.confidence).toBe(0);
    expect(parity.preferred).toEqual([]);
    expect(parity.avoid).toEqual([]);
    expect(parity.guardrail).toBe(STRATEGY_GUARDRAIL);

    const canonical = projectToGrowthStrategySnapshot({
      parity,
      patternEvidence,
      subject: { accountId: fixture.accountId },
      platform: 'x',
      meta: META,
      strategyId: 'strategy_fixture_none',
      inputsDigest: 'digest_fixture_none',
      matureCheckpointMinutes: DEFAULT_MATURE_CHECKPOINT_MINUTES,
    });
    expect(canonical.status).toBe('insufficient-evidence');
    expect(canonical.sampleSize).toBe(0);
    expect(canonical.confidence).toBe(0);
    expect(canonical.preferred).toEqual([]);
    expect(canonical.avoid).toEqual([]);
    expect(canonical.overallScore).toBe(50);
    expect(canonical.strategyVersion).toBe(STRATEGY_VERSION);
    expect(canonical.sourceWindow.strategyWindowDays).toBe(parity.strategyWindowDays);
    expect(canonical.sourceWindow.to).toBe(parity.generatedAt);
    expect(parseGrowthStrategySnapshot(canonical)).toEqual(canonical);
  });

  it('projects preferred/avoid numbers from parity and adds rationale plus evidencePostIds', () => {
    const fixture = loadGolden('tie-stable-sort') as {
      accountId: string;
      now: string;
      posts: StrategyPostEvidence[];
      snapshots: unknown[];
      config: StrategyLearningConfig;
    };
    const { parity, patternEvidence } = buildStrategyParity({
      accountId: fixture.accountId,
      now: fixture.now,
      posts: fixture.posts,
      snapshots: fixture.snapshots.map((row) => parseMetricSnapshot(row)),
      config: fixture.config,
    });
    const canonical = projectToGrowthStrategySnapshot({
      parity,
      patternEvidence,
      subject: { accountId: fixture.accountId },
      platform: 'x',
      meta: META,
      strategyId: 'strategy_fixture_tie',
      inputsDigest: 'digest_fixture_tie',
      matureCheckpointMinutes: DEFAULT_MATURE_CHECKPOINT_MINUTES,
    });
    expect(canonical.status).toBe('active');
    expect(canonical.sampleSize).toBe(parity.sampleSize);
    expect(canonical.preferred.map((pattern) => ({ dimension: pattern.dimension, value: pattern.value, lift: pattern.lift, sampleSize: pattern.sampleSize }))).toEqual(
      parity.preferred.map((pattern) => ({
        dimension: pattern.dimension,
        value: pattern.value,
        lift: pattern.lift,
        sampleSize: pattern.n,
      })),
    );
    expect(canonical.avoid.map((pattern) => ({ dimension: pattern.dimension, value: pattern.value, lift: pattern.lift, sampleSize: pattern.sampleSize }))).toEqual(
      parity.avoid.map((pattern) => ({
        dimension: pattern.dimension,
        value: pattern.value,
        lift: pattern.lift,
        sampleSize: pattern.n,
      })),
    );
    const firstPreferred = canonical.preferred[0];
    expect(firstPreferred).toBeDefined();
    if (!firstPreferred) {
      return;
    }
    expect(firstPreferred.rationale).toContain(`${firstPreferred.dimension}="${firstPreferred.value}"`);
    expect(firstPreferred.evidencePostIds.length).toBe(firstPreferred.sampleSize);
    expect(canonical.strategyVersion).toBe(STRATEGY_VERSION);
    expect(parseGrowthStrategySnapshot(canonical).status).toBe('active');
  });

  it('does not feed canonical fields back into parity output', () => {
    const fixture = loadGolden('normal-multi-sample') as {
      accountId: string;
      now: string;
      posts: StrategyPostEvidence[];
      snapshots: unknown[];
      expected: { preferred: unknown[]; avoid: unknown[]; sampleSize: number };
    };
    const { parity } = buildStrategyParity({
      accountId: fixture.accountId,
      now: fixture.now,
      posts: fixture.posts,
      snapshots: fixture.snapshots.map((row) => parseMetricSnapshot(row)),
    });
    expect(parity).not.toHaveProperty('strategyId');
    expect(parity).not.toHaveProperty('strategyVersion');
    expect(parity).not.toHaveProperty('status');
    expect(parity).not.toHaveProperty('inputsDigest');
    expect(parity.sampleSize).toBe(fixture.expected.sampleSize);
  });
});
