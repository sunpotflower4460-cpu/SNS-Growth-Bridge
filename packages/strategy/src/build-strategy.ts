import { snsNumber } from '@sns-growth-bridge/scoring';

import {
  DEFAULT_EXPLORE_RATE,
  DEFAULT_FULL_CONFIDENCE_POSTS,
  DEFAULT_MATURE_CHECKPOINT_MINUTES,
  DEFAULT_MIN_SAMPLES_PER_PATTERN,
  DEFAULT_STRATEGY_WINDOW_DAYS,
  DEFAULT_TIMEZONE,
  MS_PER_DAY,
  STRATEGY_GUARDRAIL,
} from './config.js';
import { buildFeatureStats, clamp01, meanScores } from './feature-stats.js';
import { rankPatterns } from './rank-patterns.js';
import {
  allowedPostIdsFromHistory,
  buildSamples,
  historyByExternalPostId,
  resolveNow,
  selectMatureLatestSnapshots,
  selectRecentPosts,
  selectWindowSnapshots,
} from './samples.js';
import type { BuildStrategyParityInput, StrategyParityBundle } from './types.js';

export function buildStrategyParity(input: BuildStrategyParityInput): StrategyParityBundle {
  const { accountId, posts, snapshots, config = {} } = input;
  const now = resolveNow(input.now);
  const windowDays = Math.max(1, snsNumber(config.strategyWindowDays ?? DEFAULT_STRATEGY_WINDOW_DAYS));
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  const recentHistory = selectRecentPosts(posts, accountId, cutoff);
  const allowedPostIds = allowedPostIdsFromHistory(recentHistory);
  const windowSnapshots = selectWindowSnapshots(snapshots, accountId, allowedPostIds);
  const latest = selectMatureLatestSnapshots(
    windowSnapshots,
    config.matureCheckpointMinutes ?? DEFAULT_MATURE_CHECKPOINT_MINUTES,
  );
  const byPost = historyByExternalPostId(recentHistory);
  const timeZone = config.timezone || DEFAULT_TIMEZONE;
  const samples = buildSamples(latest, windowSnapshots, byPost, timeZone, config.scoreWeights || {});
  const sampleScores = samples.map((sample) => sample.score);
  const overall = sampleScores.length ? meanScores(sampleScores) : 50;
  const { featureStats, patternEvidence } = buildFeatureStats(samples, overall);
  const minSamples = snsNumber(config.minSamplesPerPattern ?? DEFAULT_MIN_SAMPLES_PER_PATTERN);
  const { preferred, avoid } = rankPatterns(featureStats, minSamples);
  return {
    parity: {
      account: accountId,
      generatedAt: now.toISOString(),
      strategyWindowDays: windowDays,
      sampleSize: samples.length,
      overallScore: Math.round(overall * 10) / 10,
      confidence:
        Math.round(
          clamp01(samples.length / snsNumber(config.fullConfidencePosts ?? DEFAULT_FULL_CONFIDENCE_POSTS)) * 100,
        ) / 100,
      exploreRate: snsNumber(config.exploreRate ?? DEFAULT_EXPLORE_RATE),
      preferred,
      avoid,
      featureStats,
      guardrail: STRATEGY_GUARDRAIL,
    },
    patternEvidence,
  };
}
