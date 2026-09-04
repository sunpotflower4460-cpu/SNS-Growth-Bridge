import type {
  EnvelopeMeta,
  GrowthSubjectRef,
  Platform,
  StrategyFeatureStats,
  StrategyPattern,
} from '@sns-growth-bridge/contracts';
import { parseGrowthStrategySnapshot, type GrowthStrategySnapshot } from '@sns-growth-bridge/contracts';
import { snsString } from '@sns-growth-bridge/scoring';

import { MS_PER_DAY } from './config.js';
import type { FeatureStats, LegacyStrategyPattern, PatternEvidence, StrategyParityResult } from './types.js';
import { STRATEGY_VERSION } from './version.js';

export interface CanonicalStrategyProjectionInput {
  parity: StrategyParityResult;
  patternEvidence: PatternEvidence;
  subject: GrowthSubjectRef;
  platform: Platform;
  meta: EnvelopeMeta;
  strategyId: string;
  inputsDigest: string;
  matureCheckpointMinutes: number;
}

function patternRationale(pattern: LegacyStrategyPattern): string {
  const signedLift = pattern.lift > 0 ? `+${snsString(pattern.lift)}` : snsString(pattern.lift);
  return `${pattern.dimension}="${pattern.value}" had ${signedLift} lift versus the account's recent overall score across ${snsString(pattern.n)} mature samples.`;
}

function toCanonicalPattern(pattern: LegacyStrategyPattern, patternEvidence: PatternEvidence): StrategyPattern {
  const evidence = patternEvidence[pattern.dimension][pattern.value] ?? [];
  return {
    dimension: pattern.dimension,
    value: pattern.value,
    sampleSize: pattern.n,
    averageScore: pattern.averageScore,
    lift: pattern.lift,
    confidence: pattern.confidence,
    rationale: patternRationale(pattern),
    evidencePostIds: [...evidence],
  };
}

function toCanonicalFeatureStats(featureStats: FeatureStats): StrategyFeatureStats {
  const result: StrategyFeatureStats = {};
  for (const [dimension, values] of Object.entries(featureStats)) {
    const mapped: Record<string, { sampleSize: number; averageScore: number; lift: number; confidence: number }> = {};
    for (const [value, stat] of Object.entries(values)) {
      mapped[value] = {
        sampleSize: stat.n,
        averageScore: stat.averageScore,
        lift: stat.lift,
        confidence: stat.confidence,
      };
    }
    result[dimension as keyof StrategyFeatureStats] = mapped;
  }
  return result;
}

/**
 * Bridge-added Canonical fields. Must not feed back into `buildStrategyParity()`.
 */
export function projectToGrowthStrategySnapshot(input: CanonicalStrategyProjectionInput): GrowthStrategySnapshot {
  const { parity, patternEvidence, subject, platform, meta, strategyId, inputsDigest, matureCheckpointMinutes } =
    input;
  const to = parity.generatedAt;
  const from = new Date(Date.parse(to) - parity.strategyWindowDays * MS_PER_DAY).toISOString();
  const insufficient = parity.sampleSize === 0;
  return parseGrowthStrategySnapshot({
    meta,
    strategyId,
    strategyVersion: STRATEGY_VERSION,
    subject,
    platform,
    generatedAt: parity.generatedAt,
    sourceWindow: {
      from,
      to,
      strategyWindowDays: parity.strategyWindowDays,
      matureCheckpointMinutes,
    },
    sampleSize: insufficient ? 0 : parity.sampleSize,
    overallScore: parity.overallScore,
    confidence: insufficient ? 0 : parity.confidence,
    exploreRate: parity.exploreRate,
    preferred: insufficient ? [] : parity.preferred.map((pattern) => toCanonicalPattern(pattern, patternEvidence)),
    avoid: insufficient ? [] : parity.avoid.map((pattern) => toCanonicalPattern(pattern, patternEvidence)),
    featureStats: insufficient ? {} : toCanonicalFeatureStats(parity.featureStats),
    inputsDigest,
    status: insufficient ? 'insufficient-evidence' : 'active',
  });
}
