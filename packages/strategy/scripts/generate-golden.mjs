/**
 * Generates golden expected outputs from the frozen SNS-AI `buildStrategy()`.
 * Run: node packages/strategy/scripts/generate-golden.mjs
 *
 * Fixtures are stored in Bridge shape (StrategyPostEvidence / MetricSnapshot /
 * StrategyLearningConfig) so the TypeScript golden test can parse them the
 * same way a real caller would. This script converts Bridge shape -> SNS-AI
 * raw shape, runs the frozen reference, and stores the SNS-AI output as
 * `expected` alongside the Bridge-shaped inputs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStrategy } from '../fixtures/reference/sns-ai-learn.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/golden');
mkdirSync(outDir, { recursive: true });

const NOW_ISO = '2026-08-30T00:00:00.000Z';
const NOW_MS = Date.parse(NOW_ISO);
const DAY_MS = 86_400_000;

const META = {
  schemaVersion: 1,
  producer: 'sns-ai',
  producedAt: '2026-08-01T00:00:00.000Z',
  traceId: 'trace_strategy_golden',
};

function daysAgo(days) {
  return new Date(NOW_MS - days * DAY_MS).toISOString();
}

function snapshot({
  postId,
  accountId = 'acct_music',
  platform = 'x',
  externalPostId,
  checkpointMinutes = 1440,
  capturedAt,
  metrics,
}) {
  return {
    meta: { ...META, traceId: `trace_${postId}_${checkpointMinutes}` },
    snapshotId: `snap_${postId}_${checkpointMinutes}`,
    postId: `post_${postId}`,
    subject: { accountId },
    platform,
    externalPostId,
    capturedAt,
    checkpointMinutes,
    metrics,
  };
}

function historyEntry({ accountId = 'acct_music', externalPostId, publishedAt, features = {}, hasLegacyMediaUrl = false }) {
  return { accountId, externalPostId, publishedAt, features, hasLegacyMediaUrl };
}

const HIGH_METRICS = {
  impressions: 6000,
  reposts: 300,
  quotes: 60,
  shares: 90,
  bookmarks: 400,
  replies: 100,
  comments: 30,
  profileClicks: 500,
  urlClicks: 200,
  follows: 15,
};

const LOW_METRICS = {
  impressions: 400,
  reposts: 1,
  quotes: 0,
  shares: 0,
  bookmarks: 1,
  replies: 0,
  comments: 0,
  profileClicks: 1,
  urlClicks: 0,
  follows: 0,
};

const MID_METRICS = {
  impressions: 2000,
  reposts: 20,
  quotes: 4,
  shares: 6,
  bookmarks: 30,
  replies: 8,
  comments: 2,
  profileClicks: 40,
  urlClicks: 16,
  follows: 3,
};

function toSnsAiAccount(config) {
  return {
    learning: {
      strategyWindowDays: config.strategyWindowDays,
      matureCheckpointMinutes: config.matureCheckpointMinutes,
      minSamplesPerPattern: config.minSamplesPerPattern,
      fullConfidencePosts: config.fullConfidencePosts,
      exploreRate: config.exploreRate,
    },
    objectives: { weights: config.scoreWeights || {} },
    timezone: config.timezone,
  };
}

function toSnsAiHistory(entry) {
  return {
    account: entry.accountId,
    providerPostId: entry.externalPostId,
    at: entry.publishedAt,
    features: entry.features,
    mediaUrl: entry.hasLegacyMediaUrl ? 'https://cdn.example.invalid/asset.jpg' : undefined,
  };
}

function toSnsAiSnapshot(row) {
  return {
    account: row.subject.accountId,
    platform: row.platform,
    providerPostId: row.externalPostId,
    checkpointMinutes: row.checkpointMinutes,
    collectedAt: row.capturedAt,
    metrics: row.metrics,
  };
}

function writeCase(name, { accountId = 'acct_music', now = NOW_ISO, config = {}, history, snapshots }) {
  const account = toSnsAiAccount(config);
  const expected = buildStrategy({
    accountId,
    account,
    history: history.map(toSnsAiHistory),
    snapshots: snapshots.map(toSnsAiSnapshot),
    now: new Date(now),
  });
  const payload = { name, accountId, now, config, history, snapshots, expected };
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

// --- 1. no samples ---
writeCase('no-samples', { history: [], snapshots: [] });

// --- 2. one sample ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'question' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', checkpointMinutes: 1440, capturedAt: daysAgo(8), metrics: MID_METRICS }),
  ];
  writeCase('one-sample', { history: h, snapshots: s });
}

// --- 3. normal multi-sample (mixed dimensions, realistic shape) ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { topic: 'gear', hook: 'question', format: 'short' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(18), features: { topic: 'gear', hook: 'question', format: 'long' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(15), features: { topic: 'news', hook: 'statement', format: 'short' } }),
    historyEntry({ externalPostId: 'p4', publishedAt: daysAgo(12), features: { topic: 'news', hook: 'statement', format: 'long' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(18), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(16), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(13), metrics: LOW_METRICS }),
    snapshot({ postId: 'p4', externalPostId: 'p4', capturedAt: daysAgo(10), metrics: LOW_METRICS }),
  ];
  writeCase('normal-multi-sample', { history: h, snapshots: s });
}

// --- 4. strategy window exclusion ---
{
  const h = [
    historyEntry({ externalPostId: 'p_in', publishedAt: daysAgo(10), features: { hook: 'question' } }),
    historyEntry({ externalPostId: 'p_out', publishedAt: daysAgo(90), features: { hook: 'question' } }),
  ];
  const s = [
    snapshot({ postId: 'p_in', externalPostId: 'p_in', capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p_out', externalPostId: 'p_out', capturedAt: daysAgo(85), metrics: MID_METRICS }),
  ];
  writeCase('window-exclusion', { history: h, snapshots: s });
}

// --- 5. wrong account exclusion ---
{
  const h = [
    historyEntry({ accountId: 'acct_music', externalPostId: 'p_mine', publishedAt: daysAgo(10), features: { hook: 'question' } }),
    historyEntry({ accountId: 'acct_other', externalPostId: 'p_theirs', publishedAt: daysAgo(10), features: { hook: 'question' } }),
  ];
  const s = [
    snapshot({ postId: 'p_mine', accountId: 'acct_music', externalPostId: 'p_mine', capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p_theirs', accountId: 'acct_other', externalPostId: 'p_theirs', capturedAt: daysAgo(8), metrics: HIGH_METRICS }),
  ];
  writeCase('wrong-account-exclusion', { accountId: 'acct_music', history: h, snapshots: s });
}

// --- 6. missing externalPostId history exclusion ---
{
  const h = [
    historyEntry({ externalPostId: 'p_ok', publishedAt: daysAgo(10), features: { hook: 'question' } }),
    historyEntry({ externalPostId: '', publishedAt: daysAgo(10), features: { hook: 'question' } }),
  ];
  const s = [snapshot({ postId: 'p_ok', externalPostId: 'p_ok', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('missing-external-post-id-exclusion', { history: h, snapshots: s });
}

// --- 7. latest snapshot selection (newest collectedAt wins, array order irrelevant) ---
{
  const h = [historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { hook: 'question' } })];
  const s = [
    // later capturedAt appears FIRST in the array
    snapshot({ postId: 'p1', externalPostId: 'p1', checkpointMinutes: 4320, capturedAt: daysAgo(5), metrics: HIGH_METRICS }),
    // earlier capturedAt appears SECOND in the array
    snapshot({ postId: 'p1', externalPostId: 'p1', checkpointMinutes: 1440, capturedAt: daysAgo(15), metrics: LOW_METRICS }),
  ];
  writeCase('latest-snapshot-selection', { history: h, snapshots: s });
}

// --- 8 / 39. critical: latest immature snapshot drops an otherwise-mature post ---
{
  const h = [
    historyEntry({ externalPostId: 'p_immature_latest', publishedAt: daysAgo(20), features: { hook: 'question' } }),
    historyEntry({ externalPostId: 'p_control', publishedAt: daysAgo(20), features: { hook: 'question' } }),
  ];
  const s = [
    // snapshot A: mature (1440), captured first
    snapshot({
      postId: 'p_immature_latest',
      externalPostId: 'p_immature_latest',
      checkpointMinutes: 1440,
      capturedAt: daysAgo(15),
      metrics: HIGH_METRICS,
    }),
    // snapshot B: immature (360), captured LATER -> becomes "latest", then fails mature filter
    snapshot({
      postId: 'p_immature_latest',
      externalPostId: 'p_immature_latest',
      checkpointMinutes: 360,
      capturedAt: daysAgo(5),
      metrics: LOW_METRICS,
    }),
    snapshot({ postId: 'p_control', externalPostId: 'p_control', checkpointMinutes: 1440, capturedAt: daysAgo(10), metrics: MID_METRICS }),
  ];
  writeCase('latest-immature-drops-mature-history', { history: h, snapshots: s });
}

// --- 9. mature snapshot inclusion (boundary: checkpointMinutes === matureCheckpointMinutes) ---
{
  const h = [
    historyEntry({ externalPostId: 'p_boundary', publishedAt: daysAgo(10), features: { hook: 'question' } }),
    historyEntry({ externalPostId: 'p_immature', publishedAt: daysAgo(10), features: { hook: 'question' } }),
  ];
  const s = [
    snapshot({ postId: 'p_boundary', externalPostId: 'p_boundary', checkpointMinutes: 1440, capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p_immature', externalPostId: 'p_immature', checkpointMinutes: 1439, capturedAt: daysAgo(8), metrics: MID_METRICS }),
  ];
  writeCase('mature-boundary-inclusion', { history: h, snapshots: s });
}

// --- 10. same feature value grouped across posts ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { hook: 'ask' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(18), features: { hook: 'ask' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(15), features: { hook: 'ask' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(18), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(16), metrics: MID_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(13), metrics: LOW_METRICS }),
  ];
  writeCase('same-feature-grouped', { history: h, snapshots: s });
}

// --- 11. minSamples filter (n=1 "rare" stays in featureStats with nonzero
// lift but is excluded from ranked; n=2 "common" has the same nonzero lift
// and *is* ranked) ---
{
  const h = [
    historyEntry({ externalPostId: 'p_rare', publishedAt: daysAgo(22), features: { hook: 'rare' } }),
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(18), features: { hook: 'common' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(15), features: { hook: 'common' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(12), features: { hook: 'filler' } }),
    historyEntry({ externalPostId: 'p4', publishedAt: daysAgo(9), features: { hook: 'filler' } }),
  ];
  const s = [
    snapshot({ postId: 'p_rare', externalPostId: 'p_rare', capturedAt: daysAgo(20), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(16), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(13), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(10), metrics: LOW_METRICS }),
    snapshot({ postId: 'p4', externalPostId: 'p4', capturedAt: daysAgo(7), metrics: LOW_METRICS }),
  ];
  writeCase('min-samples-filter', { history: h, snapshots: s });
}

// --- 12. preferred positive lift ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { hook: 'winner' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(18), features: { hook: 'winner' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(15), features: { hook: 'baseline' } }),
    historyEntry({ externalPostId: 'p4', publishedAt: daysAgo(12), features: { hook: 'baseline' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(18), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(16), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(13), metrics: MID_METRICS }),
    snapshot({ postId: 'p4', externalPostId: 'p4', capturedAt: daysAgo(10), metrics: MID_METRICS }),
  ];
  writeCase('preferred-positive-lift', { history: h, snapshots: s });
}

// --- 13. avoid negative lift ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { hook: 'loser' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(18), features: { hook: 'loser' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(15), features: { hook: 'baseline' } }),
    historyEntry({ externalPostId: 'p4', publishedAt: daysAgo(12), features: { hook: 'baseline' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(18), metrics: LOW_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(16), metrics: LOW_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(13), metrics: MID_METRICS }),
    snapshot({ postId: 'p4', externalPostId: 'p4', capturedAt: daysAgo(10), metrics: MID_METRICS }),
  ];
  writeCase('avoid-negative-lift', { history: h, snapshots: s });
}

// --- 14. zero-lift excluded (a dimension shared identically by every sample) ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { hook: 'winner', cta: 'soft' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(18), features: { hook: 'winner', cta: 'soft' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(15), features: { hook: 'loser', cta: 'soft' } }),
    historyEntry({ externalPostId: 'p4', publishedAt: daysAgo(12), features: { hook: 'loser', cta: 'soft' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(18), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(16), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(13), metrics: LOW_METRICS }),
    snapshot({ postId: 'p4', externalPostId: 'p4', capturedAt: daysAgo(10), metrics: LOW_METRICS }),
  ];
  writeCase('zero-lift-excluded', { history: h, snapshots: s });
}

// --- 15. preferred cap 8 ---
{
  const h = [];
  const s = [];
  for (let i = 1; i <= 9; i += 1) {
    const id = `p_high_${String(i)}`;
    h.push(historyEntry({ externalPostId: id, publishedAt: daysAgo(30), features: { topic: `topic_${String(i)}` } }));
    s.push(snapshot({ postId: id, externalPostId: id, capturedAt: daysAgo(28), metrics: HIGH_METRICS }));
    const id2 = `${id}_b`;
    h.push(historyEntry({ externalPostId: id2, publishedAt: daysAgo(27), features: { topic: `topic_${String(i)}` } }));
    s.push(snapshot({ postId: id2, externalPostId: id2, capturedAt: daysAgo(25), metrics: HIGH_METRICS }));
  }
  // anchor group pulling the overall average down so all 9 high topics have positive lift
  h.push(historyEntry({ externalPostId: 'p_anchor_a', publishedAt: daysAgo(24), features: { topic: 'topic_anchor' } }));
  s.push(snapshot({ postId: 'p_anchor_a', externalPostId: 'p_anchor_a', capturedAt: daysAgo(22), metrics: LOW_METRICS }));
  h.push(historyEntry({ externalPostId: 'p_anchor_b', publishedAt: daysAgo(20), features: { topic: 'topic_anchor' } }));
  s.push(snapshot({ postId: 'p_anchor_b', externalPostId: 'p_anchor_b', capturedAt: daysAgo(18), metrics: LOW_METRICS }));
  writeCase('preferred-cap-8', { history: h, snapshots: s });
}

// --- 16. avoid cap 6 ---
{
  const h = [];
  const s = [];
  for (let i = 1; i <= 7; i += 1) {
    const id = `p_low_${String(i)}`;
    h.push(historyEntry({ externalPostId: id, publishedAt: daysAgo(30), features: { topic: `topic_${String(i)}` } }));
    s.push(snapshot({ postId: id, externalPostId: id, capturedAt: daysAgo(28), metrics: LOW_METRICS }));
    const id2 = `${id}_b`;
    h.push(historyEntry({ externalPostId: id2, publishedAt: daysAgo(27), features: { topic: `topic_${String(i)}` } }));
    s.push(snapshot({ postId: id2, externalPostId: id2, capturedAt: daysAgo(25), metrics: LOW_METRICS }));
  }
  // anchor group pulling the overall average up so all 7 low topics have negative lift
  h.push(historyEntry({ externalPostId: 'p_anchor_a', publishedAt: daysAgo(24), features: { topic: 'topic_anchor' } }));
  s.push(snapshot({ postId: 'p_anchor_a', externalPostId: 'p_anchor_a', capturedAt: daysAgo(22), metrics: HIGH_METRICS }));
  h.push(historyEntry({ externalPostId: 'p_anchor_b', publishedAt: daysAgo(20), features: { topic: 'topic_anchor' } }));
  s.push(snapshot({ postId: 'p_anchor_b', externalPostId: 'p_anchor_b', capturedAt: daysAgo(18), metrics: HIGH_METRICS }));
  writeCase('avoid-cap-6', { history: h, snapshots: s });
}

// --- 17. feature confidence n/6 ---
{
  const h = [];
  const s = [];
  for (let i = 1; i <= 4; i += 1) {
    const id = `p${String(i)}`;
    h.push(historyEntry({ externalPostId: id, publishedAt: daysAgo(30 - i), features: { hook: 'steady' } }));
    s.push(snapshot({ postId: id, externalPostId: id, capturedAt: daysAgo(28 - i), metrics: MID_METRICS }));
  }
  writeCase('feature-confidence-n-over-6', { history: h, snapshots: s });
}

// --- 18. overall score rounding ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(9), features: { hook: 'b' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(8), features: { hook: 'c' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: { impressions: 1000, reposts: 7, bookmarks: 3, replies: 2, profileClicks: 5, urlClicks: 1 } }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(7), metrics: { impressions: 1300, reposts: 11, bookmarks: 5, replies: 4, profileClicks: 9, urlClicks: 3 } }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(6), metrics: { impressions: 900, reposts: 5, bookmarks: 2, replies: 1, profileClicks: 4, urlClicks: 1 } }),
  ];
  writeCase('overall-score-rounding', { history: h, snapshots: s });
}

// --- 19. strategy confidence sampleSize/20 ---
{
  const h = [];
  const s = [];
  for (let i = 1; i <= 7; i += 1) {
    const id = `p${String(i)}`;
    h.push(historyEntry({ externalPostId: id, publishedAt: daysAgo(30 - i), features: { hook: 'steady' } }));
    s.push(snapshot({ postId: id, externalPostId: id, capturedAt: daysAgo(28 - i), metrics: MID_METRICS }));
  }
  writeCase('strategy-confidence-sample-size-over-20', { history: h, snapshots: s });
}

// --- 20. custom fullConfidencePosts ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(9), features: { hook: 'b' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(7), metrics: MID_METRICS }),
  ];
  writeCase('custom-full-confidence-posts', { history: h, snapshots: s, config: { fullConfidencePosts: 4 } });
}

// --- 21. custom exploreRate ---
{
  const h = [historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' } })];
  const s = [snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('custom-explore-rate', { history: h, snapshots: s, config: { exploreRate: 0.35 } });
}

// --- 22. custom strategyWindowDays ---
{
  const h = [
    historyEntry({ externalPostId: 'p_in', publishedAt: daysAgo(10), features: { hook: 'a' } }),
    historyEntry({ externalPostId: 'p_out', publishedAt: daysAgo(20), features: { hook: 'a' } }),
  ];
  const s = [
    snapshot({ postId: 'p_in', externalPostId: 'p_in', capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p_out', externalPostId: 'p_out', capturedAt: daysAgo(18), metrics: MID_METRICS }),
  ];
  writeCase('custom-strategy-window-days', { history: h, snapshots: s, config: { strategyWindowDays: 14 } });
}

// --- 23. custom matureCheckpointMinutes ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(10), features: { hook: 'a' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', checkpointMinutes: 360, capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', checkpointMinutes: 60, capturedAt: daysAgo(8), metrics: MID_METRICS }),
  ];
  writeCase('custom-mature-checkpoint-minutes', { history: h, snapshots: s, config: { matureCheckpointMinutes: 360 } });
}

// --- 24. postingHour Asia/Tokyo (default timezone) ---
{
  const h = [historyEntry({ externalPostId: 'p1', publishedAt: '2026-08-20T00:00:00.000Z', features: { hook: 'a' } })];
  const s = [snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('posting-hour-asia-tokyo', { history: h, snapshots: s });
}

// --- 25. custom timezone ---
{
  const h = [historyEntry({ externalPostId: 'p1', publishedAt: '2026-08-20T00:00:00.000Z', features: { hook: 'a' } })];
  const s = [snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('posting-hour-custom-timezone', { history: h, snapshots: s, config: { timezone: 'America/New_York' } });
}

// --- 26. mediaDecision existing feature preserved ---
{
  const h = [
    historyEntry({
      externalPostId: 'p1',
      publishedAt: daysAgo(10),
      features: { hook: 'a', mediaDecision: 'generate' },
      hasLegacyMediaUrl: true,
    }),
  ];
  const s = [snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('media-decision-existing-preserved', { history: h, snapshots: s });
}

// --- 27. mediaDecision fallback library ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' }, hasLegacyMediaUrl: true }),
  ];
  const s = [snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('media-decision-fallback-library', { history: h, snapshots: s });
}

// --- 28. mediaDecision fallback none ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' }, hasLegacyMediaUrl: false }),
  ];
  const s = [snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: MID_METRICS })];
  writeCase('media-decision-fallback-none', { history: h, snapshots: s });
}

// --- 29. score weight override effects ---
{
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(10), features: { hook: 'a' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(9), features: { hook: 'b' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(8), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(7), metrics: LOW_METRICS }),
  ];
  writeCase('score-weight-override', {
    history: h,
    snapshots: s,
    config: {
      scoreWeights: { exposure: 0.5, clickRate: 0.5, shareRate: 0, saveRate: 0, conversationRate: 0, profileRate: 0 },
    },
  });
}

// --- 30. tie / stable-sort behavior ---
{
  // topic(FEATURE_DIMENSIONS[0]) and hook(FEATURE_DIMENSIONS[2]) groups built
  // from identical score pairs -> identical rounded lift -> tie. topic comes
  // before hook in FEATURE_DIMENSIONS, so a stable sort must keep topic first.
  const h = [
    historyEntry({ externalPostId: 'p1', publishedAt: daysAgo(20), features: { topic: 'tied', hook: 'baseline' } }),
    historyEntry({ externalPostId: 'p2', publishedAt: daysAgo(18), features: { topic: 'tied', hook: 'baseline' } }),
    historyEntry({ externalPostId: 'p3', publishedAt: daysAgo(15), features: { topic: 'baseline', hook: 'tied' } }),
    historyEntry({ externalPostId: 'p4', publishedAt: daysAgo(12), features: { topic: 'baseline', hook: 'tied' } }),
    historyEntry({ externalPostId: 'p5', publishedAt: daysAgo(10), features: { topic: 'baseline', hook: 'baseline' } }),
    historyEntry({ externalPostId: 'p6', publishedAt: daysAgo(9), features: { topic: 'baseline', hook: 'baseline' } }),
  ];
  const s = [
    snapshot({ postId: 'p1', externalPostId: 'p1', capturedAt: daysAgo(18), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p2', externalPostId: 'p2', capturedAt: daysAgo(16), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p3', externalPostId: 'p3', capturedAt: daysAgo(13), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p4', externalPostId: 'p4', capturedAt: daysAgo(10), metrics: HIGH_METRICS }),
    snapshot({ postId: 'p5', externalPostId: 'p5', capturedAt: daysAgo(8), metrics: MID_METRICS }),
    snapshot({ postId: 'p6', externalPostId: 'p6', capturedAt: daysAgo(7), metrics: MID_METRICS }),
  ];
  writeCase('tie-stable-sort', { history: h, snapshots: s });
}

console.log(`wrote golden fixtures to ${outDir}`);
