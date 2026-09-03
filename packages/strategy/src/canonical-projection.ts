import type { EnvelopeMeta, GrowthStrategySnapshot, GrowthSubjectRef, Platform, StrategyPattern } from '@sns-growth-bridge/contracts';

import { STRATEGY_VERSION } from './version.js';
import type { LegacyStrategyPattern, StrategyParityResult, StrategyPatternEvidence } from './types.js';

const DAY_MS = 86_400_000;

/**
 * Projection-only input. Parity Core output (`StrategyParityResult` and its
 * `patternEvidence` sidecar) feeds in unchanged; Bridge-added provenance
 * fields (`strategyId`, `inputsDigest`, `meta`) are supplied by the caller
 * rather than invented here — no random UUID/hash generation.
 */
export interface CanonicalStrategyProjectionInput {
  parity: StrategyParityResult;
  patternEvidence: readonly StrategyPatternEvidence[];
  subject: GrowthSubjectRef;
  platform: Platform;
  meta: EnvelopeMeta;
  strategyId: string;
  inputsDigest: string;
  /** Same value passed as `config.matureCheckpointMinutes` to `buildStrategyParity`; not carried on `StrategyParityResult` itself. */
  matureCheckpointMinutes: number;
  hardConstraintsDigest?: string;
}

/**
 * Pure, deterministic projection from `StrategyParityResult` to the
 * canonical `GrowthStrategySnapshot` (`docs/CONTRACTS.md` §11). Bridge-added
 * fields (provenance, rationale, evidence) are additions layered on top;
 * they never feed back into Parity Core numbers.
 *
 * `status` is `'insufficient-evidence'` when `parity.sampleSize === 0`, else
 * `'active'`. Because `preferred`/`avoid` can only contain patterns backed by
 * `minSamplesPerPattern` scored samples, a zero-sample parity result already
 * yields `overallScore: 50`, `confidence: 0`, and empty `preferred`/`avoid`
 * from `buildStrategyParity` itself — this function does not need to force
 * those separately.
 */
export function projectToGrowthStrategySnapshot(input: CanonicalStrategyProjectionInput): GrowthStrategySnapshot {
  const { parity, patternEvidence, subject, platform, meta, strategyId, inputsDigest, matureCheckpointMinutes, hardConstraintsDigest } =
    input;

  const generatedAtMs = Date.parse(parity.generatedAt);
  const from = new Date(generatedAtMs - parity.strategyWindowDays * DAY_MS).toISOString();
  const to = new Date(generatedAtMs).toISOString();

  const status: GrowthStrategySnapshot['status'] = parity.sampleSize === 0 ? 'insufficient-evidence' : 'active';

  const toPattern = (pattern: LegacyStrategyPattern): StrategyPattern => {
    const evidence = patternEvidence.find((row) => row.dimension === pattern.dimension && row.value === pattern.value);
    return {
      dimension: pattern.dimension,
      value: pattern.value,
      sampleSize: pattern.n,
      averageScore: pattern.averageScore,
      lift: pattern.lift,
      confidence: pattern.confidence,
      rationale: buildRationale(pattern),
      evidencePostIds: evidence ? [...evidence.externalPostIds] : [],
    };
  };

  return {
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
    sampleSize: parity.sampleSize,
    overallScore: parity.overallScore,
    confidence: parity.confidence,
    exploreRate: parity.exploreRate,
    preferred: parity.preferred.map(toPattern),
    avoid: parity.avoid.map(toPattern),
    hardConstraintsDigest,
    inputsDigest,
    status,
  };
}

/**
 * Deterministic, non-LLM rationale text. Explanatory only — never fed back
 * into Parity Core scoring or ranking.
 */
function buildRationale(pattern: LegacyStrategyPattern): string {
  const sign = pattern.lift >= 0 ? '+' : '';
  return `${pattern.dimension}="${pattern.value}" had ${sign}${String(pattern.lift)} lift versus the account's recent overall score across ${String(pattern.n)} mature samples.`;
}
