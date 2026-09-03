import type { EnvelopeMeta } from '@sns-growth-bridge/contracts';
import { growthStrategySnapshotSchema } from '@sns-growth-bridge/contracts';
import { describe, expect, it } from 'vitest';

import { projectToGrowthStrategySnapshot } from './canonical-projection.js';
import { GUARDRAIL_TEXT } from './types.js';
import { STRATEGY_VERSION } from './version.js';
import type { StrategyParityResult, StrategyPatternEvidence } from './types.js';

const META: EnvelopeMeta = {
  schemaVersion: 1,
  producer: 'sns-growth-bridge',
  producedAt: '2026-08-30T00:00:00.000Z',
  traceId: 'trace_projection',
};

function emptyParity(overrides: Partial<StrategyParityResult> = {}): StrategyParityResult {
  return {
    account: 'acct_1',
    generatedAt: '2026-08-30T00:00:00.000Z',
    strategyWindowDays: 60,
    sampleSize: 0,
    overallScore: 50,
    confidence: 0,
    exploreRate: 0.2,
    preferred: [],
    avoid: [],
    featureStats: {},
    guardrail: GUARDRAIL_TEXT,
    ...overrides,
  };
}

describe('projectToGrowthStrategySnapshot', () => {
  it('projects zero samples to insufficient-evidence and passes contract validation', () => {
    const snapshot = projectToGrowthStrategySnapshot({
      parity: emptyParity(),
      patternEvidence: [],
      subject: { accountId: 'acct_1' },
      platform: 'x',
      meta: META,
      strategyId: 'strategy_1',
      inputsDigest: 'digest_1',
      matureCheckpointMinutes: 1440,
    });
    expect(snapshot.status).toBe('insufficient-evidence');
    expect(snapshot.sampleSize).toBe(0);
    expect(snapshot.confidence).toBe(0);
    expect(snapshot.preferred).toEqual([]);
    expect(snapshot.avoid).toEqual([]);
    expect(snapshot.strategyVersion).toBe(STRATEGY_VERSION);
    expect(() => growthStrategySnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it('projects a positive-sample result to active with evidencePostIds wired from the sidecar', () => {
    const parity = emptyParity({
      sampleSize: 3,
      overallScore: 60,
      confidence: 0.15,
      preferred: [{ dimension: 'hook', value: 'ask', n: 2, averageScore: 80, lift: 20, confidence: 0.33 }],
      avoid: [{ dimension: 'hook', value: 'tell', n: 1, averageScore: 30, lift: -30, confidence: 0.17 }],
    });
    const patternEvidence: StrategyPatternEvidence[] = [
      { dimension: 'hook', value: 'ask', externalPostIds: ['p1', 'p2'] },
      { dimension: 'hook', value: 'tell', externalPostIds: ['p3'] },
    ];
    const snapshot = projectToGrowthStrategySnapshot({
      parity,
      patternEvidence,
      subject: { accountId: 'acct_1' },
      platform: 'x',
      meta: META,
      strategyId: 'strategy_2',
      inputsDigest: 'digest_2',
      matureCheckpointMinutes: 1440,
    });
    expect(snapshot.status).toBe('active');
    expect(snapshot.preferred[0]?.evidencePostIds).toEqual(['p1', 'p2']);
    expect(snapshot.avoid[0]?.evidencePostIds).toEqual(['p3']);
    expect(snapshot.preferred[0]?.sampleSize).toBe(2);
    expect(snapshot.preferred[0]?.rationale).toContain('hook="ask"');
    expect(() => growthStrategySnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it('computes sourceWindow.from/to from generatedAt and strategyWindowDays', () => {
    const parity = emptyParity({ generatedAt: '2026-08-30T00:00:00.000Z', strategyWindowDays: 10 });
    const snapshot = projectToGrowthStrategySnapshot({
      parity,
      patternEvidence: [],
      subject: { accountId: 'acct_1' },
      platform: 'x',
      meta: META,
      strategyId: 'strategy_3',
      inputsDigest: 'digest_3',
      matureCheckpointMinutes: 1440,
    });
    expect(snapshot.sourceWindow.to).toBe('2026-08-30T00:00:00.000Z');
    expect(snapshot.sourceWindow.from).toBe('2026-08-20T00:00:00.000Z');
    expect(snapshot.sourceWindow.matureCheckpointMinutes).toBe(1440);
  });

  it('falls back to an empty evidencePostIds array when no sidecar entry matches', () => {
    const parity = emptyParity({
      sampleSize: 2,
      preferred: [{ dimension: 'hook', value: 'ask', n: 2, averageScore: 80, lift: 20, confidence: 0.33 }],
    });
    const snapshot = projectToGrowthStrategySnapshot({
      parity,
      patternEvidence: [],
      subject: { accountId: 'acct_1' },
      platform: 'x',
      meta: META,
      strategyId: 'strategy_4',
      inputsDigest: 'digest_4',
      matureCheckpointMinutes: 1440,
    });
    expect(snapshot.preferred[0]?.evidencePostIds).toEqual([]);
  });
});
