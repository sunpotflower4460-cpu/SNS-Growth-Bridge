/**
 * Generates golden expected outputs from the frozen SNS-AI buildStrategy.
 * Run: node packages/strategy/scripts/generate-golden.mjs
 *
 * Expected values come from frozen SNS-AI, not from the TypeScript port.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStrategy } from '../fixtures/reference/sns-ai-learn.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/golden');
mkdirSync(outDir, { recursive: true });

const NOW = '2026-09-01T12:00:00.000Z';
const IN_WINDOW = '2026-08-15T00:00:00.000Z';
const OUT_OF_WINDOW = '2026-06-01T00:00:00.000Z';
const CAPTURED = '2026-08-20T00:00:00.000Z';
const ACCOUNT = 'acct_example_x';

const META = {
  schemaVersion: 1,
  producer: 'sns-ai',
  producedAt: NOW,
  traceId: 'trace_strategy_golden',
};

function highMetrics() {
  return {
    impressions: 5000,
    likes: 1,
    reposts: 80,
    quotes: 10,
    shares: 10,
    bookmarks: 60,
    replies: 20,
    comments: 5,
    profileClicks: 40,
    urlClicks: 20,
  };
}

function lowMetrics() {
  return {
    impressions: 200,
    likes: 1,
    reposts: 0,
    quotes: 0,
    shares: 0,
    bookmarks: 0,
    replies: 0,
    comments: 0,
    profileClicks: 0,
    urlClicks: 0,
  };
}

function midMetrics() {
  return {
    impressions: 1000,
    likes: 1,
    reposts: 10,
    quotes: 2,
    shares: 2,
    bookmarks: 12,
    replies: 4,
    comments: 1,
    profileClicks: 8,
    urlClicks: 4,
  };
}

function post({
  id,
  accountId = ACCOUNT,
  publishedAt = IN_WINDOW,
  features = {},
  hasLegacyMediaUrl = false,
}) {
  return { accountId, externalPostId: id, publishedAt, features, hasLegacyMediaUrl };
}

function snap({
  id,
  accountId = ACCOUNT,
  platform = 'x',
  capturedAt = CAPTURED,
  checkpointMinutes = 1440,
  metrics,
  snapshotId,
}) {
  return {
    meta: { ...META, traceId: `trace_${id}_${String(checkpointMinutes)}_${capturedAt}` },
    snapshotId: snapshotId ?? `snap_${id}_${String(checkpointMinutes)}`,
    postId: `post_${id}`,
    subject: { accountId },
    platform,
    externalPostId: id,
    capturedAt,
    checkpointMinutes,
    metrics,
  };
}

function pair(id, features, metrics, extra = {}) {
  return {
    post: post({ id, features, ...extra }),
    snapshot: snap({ id, metrics, ...extra }),
  };
}

function toSnsAiHistory(posts) {
  return posts.map((row) => ({
    account: row.accountId,
    providerPostId: row.externalPostId,
    at: row.publishedAt,
    features: row.features,
    mediaUrl: row.hasLegacyMediaUrl ? 'https://example.invalid/library-media' : '',
  }));
}

function toSnsAiSnapshots(snapshots) {
  return snapshots.map((row) => ({
    account: row.subject.accountId,
    platform: row.platform,
    providerPostId: row.externalPostId,
    collectedAt: row.capturedAt,
    checkpointMinutes: row.checkpointMinutes,
    metrics: row.metrics,
  }));
}

function toSnsAiAccount(config = {}) {
  return {
    learning: {
      strategyWindowDays: config.strategyWindowDays,
      matureCheckpointMinutes: config.matureCheckpointMinutes,
      minSamplesPerPattern: config.minSamplesPerPattern,
      fullConfidencePosts: config.fullConfidencePosts,
      exploreRate: config.exploreRate,
    },
    schedule: config.timezone ? { timezone: config.timezone } : {},
    timezone: config.timezone,
    objectives: { weights: config.scoreWeights || {} },
  };
}

function writeCase(name, { accountId = ACCOUNT, now = NOW, config = {}, posts, snapshots }) {
  const expected = buildStrategy({
    accountId,
    account: toSnsAiAccount(config),
    history: toSnsAiHistory(posts),
    snapshots: toSnsAiSnapshots(snapshots),
    now: new Date(now),
  });
  const payload = { name, accountId, now, config, posts, snapshots, expected };
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

function manyHigh(prefix, count, featuresFor) {
  const posts = [];
  const snapshots = [];
  for (let i = 1; i <= count; i += 1) {
    const id = `${prefix}_${String(i)}`;
    const built = pair(id, featuresFor(i), highMetrics());
    posts.push(built.post);
    snapshots.push(built.snapshot);
  }
  return { posts, snapshots };
}

function manyLow(prefix, count, featuresFor) {
  const posts = [];
  const snapshots = [];
  for (let i = 1; i <= count; i += 1) {
    const id = `${prefix}_${String(i)}`;
    const built = pair(id, featuresFor(i), lowMetrics());
    posts.push(built.post);
    snapshots.push(built.snapshot);
  }
  return { posts, snapshots };
}

const highA = pair('high_a', { topic: 'growth', hook: 'story' }, highMetrics());
const highB = pair('high_b', { topic: 'growth', hook: 'story' }, highMetrics());
const lowA = pair('low_a', { topic: 'news', hook: 'question' }, lowMetrics());
const lowB = pair('low_b', { topic: 'news', hook: 'question' }, lowMetrics());
const midA = pair('mid_a', { topic: 'growth', hook: 'statement' }, midMetrics());

writeCase('no-samples', { posts: [], snapshots: [] });

writeCase('one-sample', {
  posts: [highA.post],
  snapshots: [highA.snapshot],
});

writeCase('normal-multi-sample', {
  posts: [highA.post, highB.post, lowA.post, lowB.post, midA.post],
  snapshots: [highA.snapshot, highB.snapshot, lowA.snapshot, lowB.snapshot, midA.snapshot],
});

writeCase('strategy-window-exclusion', {
  posts: [
    highA.post,
    post({ id: 'old_out', publishedAt: OUT_OF_WINDOW, features: { topic: 'ancient', hook: 'story' } }),
  ],
  snapshots: [
    highA.snapshot,
    snap({ id: 'old_out', metrics: highMetrics() }),
  ],
});

writeCase('wrong-account-exclusion', {
  posts: [
    highA.post,
    post({ id: 'other_acct', accountId: 'acct_other', features: { topic: 'foreign', hook: 'story' } }),
  ],
  snapshots: [
    highA.snapshot,
    snap({ id: 'other_acct', accountId: 'acct_other', metrics: highMetrics() }),
  ],
});

writeCase('missing-external-post-id-exclusion', {
  posts: [
    highA.post,
    post({ id: '', features: { topic: 'ghost', hook: 'story' } }),
  ],
  snapshots: [
    highA.snapshot,
    snap({ id: 'orphan_metrics', metrics: highMetrics() }),
  ],
});

writeCase('latest-snapshot-selection', {
  posts: [post({ id: 'p_latest', features: { topic: 'growth', hook: 'story' } })],
  snapshots: [
    snap({
      id: 'p_latest',
      capturedAt: '2026-08-18T00:00:00.000Z',
      checkpointMinutes: 1440,
      metrics: lowMetrics(),
      snapshotId: 'snap_p_latest_first',
    }),
    snap({
      id: 'p_latest',
      capturedAt: '2026-08-21T00:00:00.000Z',
      checkpointMinutes: 1440,
      metrics: highMetrics(),
      snapshotId: 'snap_p_latest_second',
    }),
  ],
});

writeCase('immature-latest-exclusion', {
  posts: [post({ id: 'p_immature', features: { topic: 'growth', hook: 'story' } })],
  snapshots: [
    snap({
      id: 'p_immature',
      checkpointMinutes: 360,
      metrics: highMetrics(),
    }),
  ],
});

writeCase('mature-snapshot-inclusion', {
  posts: [post({ id: 'p_mature', features: { topic: 'growth', hook: 'story' } })],
  snapshots: [
    snap({
      id: 'p_mature',
      checkpointMinutes: 1440,
      metrics: highMetrics(),
    }),
  ],
});

writeCase('latest-then-immature-drops-post', {
  posts: [
    post({ id: 'p_drop', features: { topic: 'growth', hook: 'story' } }),
    post({ id: 'p_keep', features: { topic: 'news', hook: 'question' } }),
  ],
  snapshots: [
    snap({
      id: 'p_drop',
      capturedAt: '2026-08-18T00:00:00.000Z',
      checkpointMinutes: 1440,
      metrics: highMetrics(),
      snapshotId: 'snap_p_drop_mature_first',
    }),
    snap({
      id: 'p_drop',
      capturedAt: '2026-08-21T00:00:00.000Z',
      checkpointMinutes: 360,
      metrics: highMetrics(),
      snapshotId: 'snap_p_drop_immature_later',
    }),
    snap({
      id: 'p_keep',
      checkpointMinutes: 1440,
      metrics: midMetrics(),
    }),
  ],
});

writeCase('same-feature-grouped', {
  posts: [
    pair('g1', { hook: 'story' }, highMetrics()).post,
    pair('g2', { hook: 'story' }, midMetrics()).post,
    pair('g3', { hook: 'question' }, lowMetrics()).post,
    pair('g4', { hook: 'question' }, lowMetrics()).post,
  ],
  snapshots: [
    pair('g1', { hook: 'story' }, highMetrics()).snapshot,
    pair('g2', { hook: 'story' }, midMetrics()).snapshot,
    pair('g3', { hook: 'question' }, lowMetrics()).snapshot,
    pair('g4', { hook: 'question' }, lowMetrics()).snapshot,
  ],
});

writeCase('min-samples-filter', {
  posts: [
    pair('ms1', { hook: 'story' }, highMetrics()).post,
    pair('ms2', { hook: 'story' }, highMetrics()).post,
    pair('ms3', { hook: 'question' }, lowMetrics()).post,
  ],
  snapshots: [
    pair('ms1', { hook: 'story' }, highMetrics()).snapshot,
    pair('ms2', { hook: 'story' }, highMetrics()).snapshot,
    pair('ms3', { hook: 'question' }, lowMetrics()).snapshot,
  ],
});

writeCase('preferred-positive-lift', {
  posts: [highA.post, highB.post, lowA.post, lowB.post],
  snapshots: [highA.snapshot, highB.snapshot, lowA.snapshot, lowB.snapshot],
});

writeCase('avoid-negative-lift', {
  posts: [highA.post, highB.post, lowA.post, lowB.post],
  snapshots: [highA.snapshot, highB.snapshot, lowA.snapshot, lowB.snapshot],
});

writeCase('zero-lift-excluded', {
  posts: [
    pair('z1', { hook: 'story', topic: 'same' }, midMetrics()).post,
    pair('z2', { hook: 'story', topic: 'same' }, midMetrics()).post,
  ],
  snapshots: [
    pair('z1', { hook: 'story', topic: 'same' }, midMetrics()).snapshot,
    pair('z2', { hook: 'story', topic: 'same' }, midMetrics()).snapshot,
  ],
});

{
  const highs = manyHigh('pref', 18, (i) => ({ topic: `t${String(Math.ceil(i / 2))}` }));
  const lows = manyLow('pref_low', 2, () => ({ topic: 'ballast' }));
  writeCase('preferred-cap-8', {
    posts: [...highs.posts, ...lows.posts],
    snapshots: [...highs.snapshots, ...lows.snapshots],
  });
}

{
  const lows = manyLow('avoid', 14, (i) => ({ topic: `bad${String(Math.ceil(i / 2))}` }));
  const highs = manyHigh('avoid_high', 4, () => ({ topic: 'ballast' }));
  writeCase('avoid-cap-6', {
    posts: [...lows.posts, ...highs.posts],
    snapshots: [...lows.snapshots, ...highs.snapshots],
  });
}

{
  const grouped = manyHigh('conf', 3, () => ({ hook: 'story' }));
  const others = manyLow('conf_low', 2, () => ({ hook: 'question' }));
  writeCase('feature-confidence-n-over-6', {
    posts: [...grouped.posts, ...others.posts],
    snapshots: [...grouped.snapshots, ...others.snapshots],
  });
}

writeCase('overall-score-rounding', {
  posts: [
    pair('r1', { hook: 'story' }, highMetrics()).post,
    pair('r2', { hook: 'question' }, lowMetrics()).post,
    pair('r3', { hook: 'statement' }, midMetrics()).post,
  ],
  snapshots: [
    pair('r1', { hook: 'story' }, highMetrics()).snapshot,
    pair('r2', { hook: 'question' }, lowMetrics()).snapshot,
    pair('r3', { hook: 'statement' }, midMetrics()).snapshot,
  ],
});

{
  const four = manyHigh('sc', 4, (i) => ({ hook: i <= 2 ? 'story' : 'question' }));
  writeCase('strategy-confidence-sample-size-over-20', {
    posts: four.posts,
    snapshots: four.snapshots,
  });
}

{
  const four = manyHigh('fc', 4, (i) => ({ hook: i <= 2 ? 'story' : 'question' }));
  writeCase('custom-full-confidence-posts', {
    config: { fullConfidencePosts: 10 },
    posts: four.posts,
    snapshots: four.snapshots,
  });
}

writeCase('custom-explore-rate', {
  config: { exploreRate: 0.5 },
  posts: [highA.post, highB.post],
  snapshots: [highA.snapshot, highB.snapshot],
});

writeCase('custom-strategy-window-days', {
  config: { strategyWindowDays: 7 },
  posts: [
    post({ id: 'inside_7', publishedAt: '2026-08-28T12:00:00.000Z', features: { topic: 'recent', hook: 'story' } }),
    post({ id: 'outside_7', publishedAt: '2026-08-20T12:00:00.000Z', features: { topic: 'older', hook: 'story' } }),
  ],
  snapshots: [
    snap({ id: 'inside_7', metrics: highMetrics() }),
    snap({ id: 'outside_7', metrics: highMetrics() }),
  ],
});

writeCase('custom-mature-checkpoint-minutes', {
  config: { matureCheckpointMinutes: 4320 },
  posts: [
    post({ id: 'at_1440', features: { topic: 'day', hook: 'story' } }),
    post({ id: 'at_4320', features: { topic: 'three_day', hook: 'story' } }),
  ],
  snapshots: [
    snap({ id: 'at_1440', checkpointMinutes: 1440, metrics: highMetrics() }),
    snap({ id: 'at_4320', checkpointMinutes: 4320, metrics: highMetrics() }),
  ],
});

writeCase('posting-hour-asia-tokyo', {
  posts: [
    post({
      id: 'hour_tokyo',
      publishedAt: '2026-08-15T00:30:00.000Z',
      features: { topic: 'timing' },
    }),
    post({
      id: 'hour_tokyo_b',
      publishedAt: '2026-08-15T00:30:00.000Z',
      features: { topic: 'timing' },
    }),
  ],
  snapshots: [
    snap({ id: 'hour_tokyo', metrics: highMetrics() }),
    snap({ id: 'hour_tokyo_b', metrics: highMetrics() }),
  ],
});

writeCase('custom-timezone', {
  config: { timezone: 'America/New_York' },
  posts: [
    post({
      id: 'hour_ny',
      publishedAt: '2026-08-15T00:30:00.000Z',
      features: { topic: 'timing' },
    }),
    post({
      id: 'hour_ny_b',
      publishedAt: '2026-08-15T00:30:00.000Z',
      features: { topic: 'timing' },
    }),
  ],
  snapshots: [
    snap({ id: 'hour_ny', metrics: highMetrics() }),
    snap({ id: 'hour_ny_b', metrics: highMetrics() }),
  ],
});

writeCase('media-decision-existing-preserved', {
  posts: [
    post({
      id: 'md_keep_a',
      features: { mediaDecision: 'generate' },
      hasLegacyMediaUrl: true,
    }),
    post({
      id: 'md_keep_b',
      features: { mediaDecision: 'generate' },
      hasLegacyMediaUrl: true,
    }),
  ],
  snapshots: [
    snap({ id: 'md_keep_a', metrics: highMetrics() }),
    snap({ id: 'md_keep_b', metrics: highMetrics() }),
  ],
});

writeCase('media-decision-fallback-library', {
  posts: [
    post({ id: 'md_lib_a', features: { topic: 'media' }, hasLegacyMediaUrl: true }),
    post({ id: 'md_lib_b', features: { topic: 'media' }, hasLegacyMediaUrl: true }),
  ],
  snapshots: [
    snap({ id: 'md_lib_a', metrics: highMetrics() }),
    snap({ id: 'md_lib_b', metrics: highMetrics() }),
  ],
});

writeCase('media-decision-fallback-none', {
  posts: [
    post({ id: 'md_none_a', features: { topic: 'media' }, hasLegacyMediaUrl: false }),
    post({ id: 'md_none_b', features: { topic: 'media' }, hasLegacyMediaUrl: false }),
  ],
  snapshots: [
    snap({ id: 'md_none_a', metrics: highMetrics() }),
    snap({ id: 'md_none_b', metrics: highMetrics() }),
  ],
});

writeCase('score-weight-override', {
  config: {
    scoreWeights: {
      exposure: 0.5,
      clickRate: 0.5,
      shareRate: 0,
      saveRate: 0,
      conversationRate: 0,
      profileRate: 0,
    },
  },
  posts: [highA.post, highB.post, lowA.post, lowB.post],
  snapshots: [highA.snapshot, highB.snapshot, lowA.snapshot, lowB.snapshot],
});

writeCase('tie-stable-sort', {
  posts: [
    pair('tie_high_1', { topic: 'ai', hook: 'story' }, highMetrics()).post,
    pair('tie_high_2', { topic: 'ai', hook: 'story' }, highMetrics()).post,
    pair('tie_low_1', { topic: 'other', hook: 'question' }, lowMetrics()).post,
    pair('tie_low_2', { topic: 'other', hook: 'question' }, lowMetrics()).post,
  ],
  snapshots: [
    pair('tie_high_1', { topic: 'ai', hook: 'story' }, highMetrics()).snapshot,
    pair('tie_high_2', { topic: 'ai', hook: 'story' }, highMetrics()).snapshot,
    pair('tie_low_1', { topic: 'other', hook: 'question' }, lowMetrics()).snapshot,
    pair('tie_low_2', { topic: 'other', hook: 'question' }, lowMetrics()).snapshot,
  ],
});

writeCase('history-map-overwrite', {
  posts: [
    post({ id: 'same_post', features: { hook: 'story', topic: 'first' } }),
    post({ id: 'same_post', features: { hook: 'question', topic: 'second' } }),
    post({ id: 'other_post', features: { hook: 'story', topic: 'other' } }),
  ],
  snapshots: [
    snap({ id: 'same_post', metrics: highMetrics() }),
    snap({ id: 'other_post', metrics: lowMetrics() }),
  ],
});

writeCase('scoring-peers-are-window-snapshots', {
  posts: [
    post({ id: 'mature_peer_target', features: { hook: 'story' } }),
    post({ id: 'immature_peer_only', features: { hook: 'question' } }),
  ],
  snapshots: [
    snap({ id: 'mature_peer_target', checkpointMinutes: 1440, metrics: midMetrics() }),
    snap({ id: 'immature_peer_only', checkpointMinutes: 60, metrics: highMetrics() }),
  ],
});

console.log(`wrote golden fixtures to ${outDir}`);
