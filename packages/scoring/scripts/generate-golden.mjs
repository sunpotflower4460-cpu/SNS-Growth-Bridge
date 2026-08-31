/**
 * Generates golden expected outputs from the frozen SNS-AI scorer.
 * Run: node packages/scoring/scripts/generate-golden.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scoreSnapshot } from '../fixtures/reference/sns-ai-scorer.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/golden');
mkdirSync(outDir, { recursive: true });

const META = {
  schemaVersion: 1,
  producer: 'sns-ai',
  producedAt: '2026-08-01T12:00:00.000Z',
  traceId: 'trace_score_golden',
};

function snapshot({
  postId,
  accountId = 'acct_example_x',
  platform = 'x',
  externalPostId,
  checkpointMinutes = 1440,
  metrics,
}) {
  return {
    meta: { ...META, traceId: `trace_${postId}` },
    snapshotId: `snap_${postId}`,
    postId,
    subject: { accountId },
    platform,
    externalPostId,
    capturedAt: '2026-08-01T12:00:00.000Z',
    checkpointMinutes,
    metrics,
  };
}

function toSnsAi(row) {
  return {
    account: row.subject.accountId,
    platform: row.platform,
    providerPostId: row.externalPostId,
    checkpointMinutes: row.checkpointMinutes,
    metrics: row.metrics,
  };
}

function writeCase(name, { target, peers = [], weightOverride = {} }) {
  const expected = scoreSnapshot(toSnsAi(target), peers.map(toSnsAi), weightOverride);
  const payload = { name, target, peers, weightOverride, expected };
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

const xTarget = snapshot({
  postId: 'post_x_target',
  externalPostId: 'ext_x_target',
  metrics: {
    impressions: 2000,
    likes: 10,
    reposts: 20,
    quotes: 4,
    shares: 6,
    bookmarks: 30,
    replies: 8,
    comments: 2,
    profileClicks: 40,
    urlClicks: 16,
    follows: 3,
  },
});

const xPeerA = snapshot({
  postId: 'post_x_peer_a',
  externalPostId: 'ext_x_peer_a',
  metrics: {
    impressions: 1000,
    likes: 5,
    reposts: 10,
    quotes: 2,
    shares: 3,
    bookmarks: 12,
    replies: 4,
    comments: 1,
    profileClicks: 20,
    urlClicks: 8,
    follows: 1,
  },
});

const xPeerB = snapshot({
  postId: 'post_x_peer_b',
  externalPostId: 'ext_x_peer_b',
  metrics: {
    impressions: 3000,
    likes: 50,
    reposts: 40,
    quotes: 8,
    shares: 12,
    bookmarks: 60,
    replies: 16,
    comments: 4,
    profileClicks: 80,
    urlClicks: 24,
    follows: 6,
  },
});

const xPeerOtherCheckpoint = snapshot({
  postId: 'post_x_peer_60m',
  externalPostId: 'ext_x_peer_60m',
  checkpointMinutes: 60,
  metrics: {
    impressions: 500,
    reposts: 2,
    bookmarks: 4,
    replies: 1,
    profileClicks: 5,
    urlClicks: 2,
  },
});

const xPeerOtherAccount = snapshot({
  postId: 'post_other_acct',
  accountId: 'acct_other',
  externalPostId: 'ext_other_acct',
  metrics: {
    impressions: 99999,
    reposts: 999,
    bookmarks: 999,
    replies: 999,
    profileClicks: 999,
    urlClicks: 999,
  },
});

const xPeerOtherPlatform = snapshot({
  postId: 'post_ig_same_acct',
  platform: 'instagram',
  externalPostId: 'ext_ig_same_acct',
  metrics: {
    impressions: 88888,
    shares: 888,
    saved: 888,
    comments: 888,
    follows: 88,
    videoViews: 8000,
    playback100: 7000,
  },
});

writeCase('x-empty-baseline', { target: xTarget, peers: [] });

writeCase('x-normal', { target: xTarget, peers: [xPeerA, xPeerB] });

writeCase('x-high-performance', {
  target: snapshot({
    postId: 'post_x_high',
    externalPostId: 'ext_x_high',
    metrics: {
      impressions: 8000,
      likes: 1,
      reposts: 200,
      quotes: 40,
      shares: 60,
      bookmarks: 300,
      replies: 80,
      comments: 20,
      profileClicks: 400,
      urlClicks: 160,
    },
  }),
  peers: [xPeerA, xPeerB],
});

writeCase('x-low-performance', {
  target: snapshot({
    postId: 'post_x_low',
    externalPostId: 'ext_x_low',
    metrics: {
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
    },
  }),
  peers: [xPeerA, xPeerB],
});

const igTarget = snapshot({
  postId: 'post_ig_target',
  accountId: 'acct_example_ig',
  platform: 'instagram',
  externalPostId: 'ext_ig_target',
  metrics: {
    impressions: 4000,
    likes: 200,
    shares: 40,
    saved: 80,
    comments: 20,
    follows: 12,
    videoViews: 3500,
    playback100: 1400,
    reelSkipRate: 0.35,
  },
});

const igPeer = snapshot({
  postId: 'post_ig_peer',
  accountId: 'acct_example_ig',
  platform: 'instagram',
  externalPostId: 'ext_ig_peer',
  metrics: {
    impressions: 2500,
    likes: 80,
    shares: 15,
    saved: 30,
    comments: 8,
    follows: 4,
    videoViews: 2000,
    playback100: 600,
    reelSkipRate: 0.5,
  },
});

writeCase('instagram-normal', { target: igTarget, peers: [igPeer] });

writeCase('instagram-watch-quality', {
  target: snapshot({
    postId: 'post_ig_watch',
    accountId: 'acct_example_ig',
    platform: 'instagram',
    externalPostId: 'ext_ig_watch',
    metrics: {
      impressions: 1500,
      shares: 10,
      saved: 20,
      comments: 5,
      follows: 2,
      videoViews: 1200,
      playback100: 900,
      reelSkipRate: 0.1,
    },
  }),
  peers: [igPeer],
});

writeCase('same-checkpoint-baseline', {
  target: xTarget,
  peers: [xPeerA, xPeerB, xPeerOtherCheckpoint, xPeerOtherAccount, xPeerOtherPlatform],
});

writeCase('fallback-checkpoint-baseline', {
  target: xTarget,
  peers: [xPeerOtherCheckpoint, xPeerOtherAccount, xPeerOtherPlatform],
});

writeCase('likes-ignored', {
  target: snapshot({
    ...xTarget,
    postId: 'post_x_likes_high',
    snapshotId: 'snap_post_x_likes_high',
    metrics: { ...xTarget.metrics, likes: 100000 },
  }),
  peers: [xPeerA, xPeerB],
});

writeCase('reach-fallback', {
  target: snapshot({
    postId: 'post_reach',
    externalPostId: 'ext_reach',
    metrics: { reach: 1500, reposts: 15, bookmarks: 30, replies: 6, profileClicks: 12, urlClicks: 9 },
  }),
});

writeCase('views-fallback', {
  target: snapshot({
    postId: 'post_views',
    externalPostId: 'ext_views',
    metrics: { views: 900, reposts: 9, bookmarks: 18, replies: 3, profileClicks: 6, urlClicks: 3 },
  }),
});

writeCase('exposure-zero', {
  target: snapshot({
    postId: 'post_zero_exp',
    externalPostId: 'ext_zero_exp',
    metrics: { impressions: 0, reach: 0, views: 0, reposts: 5, bookmarks: 5, replies: 5 },
  }),
});

writeCase('youtube-x-weight-fallback', {
  target: snapshot({
    postId: 'post_yt',
    platform: 'youtube',
    externalPostId: 'ext_yt',
    metrics: {
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
      videoViews: 1800,
      playback100: 400,
    },
  }),
  peers: [
    snapshot({
      postId: 'post_yt_peer',
      platform: 'youtube',
      externalPostId: 'ext_yt_peer',
      metrics: {
        impressions: 1000,
        reposts: 10,
        bookmarks: 12,
        replies: 4,
        profileClicks: 20,
        urlClicks: 8,
      },
    }),
  ],
});

writeCase('weight-override', {
  target: xTarget,
  peers: [xPeerA, xPeerB],
  weightOverride: { exposure: 0.5, clickRate: 0.5, shareRate: 0, saveRate: 0, conversationRate: 0, profileRate: 0 },
});

writeCase('zero-weight-total', {
  target: xTarget,
  peers: [xPeerA],
  weightOverride: {
    exposure: 0,
    shareRate: 0,
    saveRate: 0,
    conversationRate: 0,
    profileRate: 0,
    clickRate: 0,
  },
});

console.log(`wrote golden fixtures to ${outDir}`);
