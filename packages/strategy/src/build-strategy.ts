import { scoreSnapshot } from '@sns-growth-bridge/scoring';

import { computeFeatureStats } from './feature-stats.js';
import { historyFeatures } from './history-features.js';
import { latestSnapshots } from './latest-snapshots.js';
import { clamp, mean, round1, round2, snsNumber, snsString } from './math.js';
import { rankPatterns } from './rank-patterns.js';
import { GUARDRAIL_TEXT } from './types.js';
import type {
  BuildStrategyParityInput,
  BuildStrategyParityResult,
  StrategyParityResult,
  StrategyPostEvidence,
  StrategySample,
} from './types.js';

const DAY_MS = 86_400_000;

/**
 * Pure port of SNS-AI `buildStrategy()` (`src/learning/learn.mjs`).
 *
 * Filtering order (do not reorder — see `docs/phase4/STRATEGY_PARITY.md`):
 *
 * 1. `recentHistory` — this account, has `externalPostId`, `publishedAt` inside
 *    `[now - windowDays*86_400_000, +inf)`.
 * 2. `allowedPostIds` — the set of `externalPostId`s from step 1.
 * 3. `windowSnapshots` — this account's `MetricSnapshot`s whose `externalPostId`
 *    is in `allowedPostIds`. This full (non-deduped, non-mature-filtered) list
 *    is the scoring peer set for every sample (see step 6).
 * 4. `latestSnapshots(windowSnapshots)` — newest-`capturedAt` snapshot per post.
 * 5. Mature filter — keep only `checkpointMinutes >= matureCheckpointMinutes`,
 *    applied *after* step 4, not before. A post whose latest-collected
 *    snapshot is immature is dropped even if an older, mature snapshot for
 *    the same post exists in `windowSnapshots` (see the golden
 *    `latest-immature-drops-mature-history` fixture).
 * 6. Join each surviving snapshot to `recentHistory` by `externalPostId`
 *    (last entry wins on duplicate ids); drop snapshots with no matching post.
 * 7. Score each sample with `scoreSnapshot(snapshot, windowSnapshots, weights)`
 *    — peers are the full window snapshot set, not just mature/latest ones.
 */
export function buildStrategyParity(input: BuildStrategyParityInput): BuildStrategyParityResult {
  const { accountId, history, snapshots, now, config = {} } = input;

  const windowDays = Math.max(1, snsNumber(config.strategyWindowDays ?? 60));
  const matureCheckpointMinutes = snsNumber(config.matureCheckpointMinutes ?? 1440);
  const minSamplesPerPattern = snsNumber(config.minSamplesPerPattern ?? 2);
  const fullConfidencePosts = snsNumber(config.fullConfidencePosts ?? 20);
  const exploreRate = snsNumber(config.exploreRate ?? 0.2);
  const timeZone = config.timezone || 'Asia/Tokyo';
  const scoreWeights = config.scoreWeights ?? {};

  const cutoff = now.getTime() - windowDays * DAY_MS;

  const recentHistory = history.filter(
    (entry) => entry.accountId === accountId && entry.externalPostId && Date.parse(entry.publishedAt || '') >= cutoff,
  );

  const allowedPostIds = new Set(recentHistory.map((entry) => snsString(entry.externalPostId)));

  const windowSnapshots = snapshots.filter(
    (snapshot) => snapshot.subject.accountId === accountId && allowedPostIds.has(snsString(snapshot.externalPostId)),
  );

  const matureLatest = latestSnapshots(windowSnapshots).filter(
    (snapshot) => snsNumber(snapshot.checkpointMinutes) >= matureCheckpointMinutes,
  );

  const postByExternalId = new Map<string, StrategyPostEvidence>();
  for (const entry of recentHistory) {
    postByExternalId.set(snsString(entry.externalPostId), entry);
  }

  const samples: StrategySample[] = [];
  for (const snapshot of matureLatest) {
    const post = postByExternalId.get(snsString(snapshot.externalPostId));
    if (!post) {
      continue;
    }
    const scored = scoreSnapshot(snapshot, windowSnapshots, scoreWeights);
    samples.push({
      externalPostId: snsString(snapshot.externalPostId),
      score: scored.score,
      scoreConfidence: scored.confidence,
      features: historyFeatures(post, timeZone),
    });
  }

  const sampleScores = samples.map((sample) => sample.score);
  const overallScore = sampleScores.length ? mean(sampleScores) : 50;

  const { featureStats, patternEvidence } = computeFeatureStats(samples, overallScore);
  const { preferred, avoid } = rankPatterns(featureStats, minSamplesPerPattern);

  const parity: StrategyParityResult = {
    account: accountId,
    generatedAt: now.toISOString(),
    strategyWindowDays: windowDays,
    sampleSize: samples.length,
    overallScore: round1(overallScore),
    confidence: round2(clamp(samples.length / fullConfidencePosts, 0, 1)),
    exploreRate,
    preferred,
    avoid,
    featureStats,
    guardrail: GUARDRAIL_TEXT,
  };

  return { parity, patternEvidence };
}
