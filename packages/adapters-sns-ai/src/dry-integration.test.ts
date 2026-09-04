import { scoreSnapshot } from '@sns-growth-bridge/scoring';
import { buildStrategyParity, projectToGrowthStrategySnapshot } from '@sns-growth-bridge/strategy';
import { describe, expect, it } from 'vitest';

import { adaptSnsAiHistoryToPublishedPost } from './history.js';
import { adaptSnsAiMetricSnapshot } from './metric.js';
import { SNS_AI_RUNTIME_POLICY_INVARIANTS } from './runtime-policy.js';
import { adaptSnsAiHistoryToStrategyPostEvidence } from './strategy-input.js';
import { CONTEXT, historyRow, metricRow } from './test-utils.js';
import { PACKAGE_PHASE, SNS_AI_METRIC_SNAPSHOT_STATUS } from './version.js';

describe('offline dry integration', () => {
  it('feeds adapter output into Phase 3 scorer and Phase 4 strategy without writes', () => {
    const targetHistory = historyRow({
      providerPostId: 'ext_x_target',
      features: { topic: 'music', hook: 'question' },
    });
    const peerHistory = historyRow({
      providerPostId: 'ext_x_peer',
      features: { topic: 'gear', hook: 'list' },
    });
    const targetMetric = metricRow({
      providerPostId: 'ext_x_target',
      metrics: {
        impressions: 2000,
        likes: 10,
        reposts: 20,
        quotes: 4,
        bookmarks: 30,
        replies: 8,
        profileClicks: 40,
        urlClicks: 16,
      },
    });
    const peerMetric = metricRow({
      providerPostId: 'ext_x_peer',
      metrics: {
        impressions: 1000,
        likes: 5,
        reposts: 10,
        quotes: 2,
        bookmarks: 12,
        replies: 4,
        profileClicks: 20,
        urlClicks: 8,
      },
    });

    const published = adaptSnsAiHistoryToPublishedPost({ row: targetHistory }, CONTEXT);
    const targetSnap = adaptSnsAiMetricSnapshot({ row: targetMetric }, CONTEXT);
    const peerSnap = adaptSnsAiMetricSnapshot({ row: peerMetric }, CONTEXT);
    const targetEvidence = adaptSnsAiHistoryToStrategyPostEvidence({
      row: targetHistory,
      accountId: 'music-tools-x',
    });
    const peerEvidence = adaptSnsAiHistoryToStrategyPostEvidence({
      row: peerHistory,
      accountId: 'music-tools-x',
    });

    expect(published.status).toBe('mapped');
    expect(targetSnap.status).toBe('mapped');
    expect(peerSnap.status).toBe('mapped');
    expect(targetEvidence.status).toBe('mapped');
    expect(peerEvidence.status).toBe('mapped');
    if (
      published.status !== 'mapped' ||
      targetSnap.status !== 'mapped' ||
      peerSnap.status !== 'mapped' ||
      targetEvidence.status !== 'mapped' ||
      peerEvidence.status !== 'mapped'
    ) {
      return;
    }

    expect(published.value.externalPostId).toBe(targetSnap.value.externalPostId);
    const scored = scoreSnapshot(targetSnap.value, [peerSnap.value]);
    const likesBoosted = scoreSnapshot(
      { ...targetSnap.value, metrics: { ...targetSnap.value.metrics, likes: 100000 } },
      [peerSnap.value],
    );
    expect(likesBoosted.score).toBe(scored.score);
    expect(JSON.stringify(scored.components)).not.toContain('likes');

    const bundle = buildStrategyParity({
      accountId: 'music-tools-x',
      now: '2026-09-04T12:00:00.000Z',
      posts: [targetEvidence.value, peerEvidence.value],
      snapshots: [targetSnap.value, peerSnap.value],
    });
    expect(bundle.parity.account).toBe('music-tools-x');
    expect(bundle.parity.sampleSize).toBeGreaterThan(0);

    const canonical = projectToGrowthStrategySnapshot({
      parity: bundle.parity,
      patternEvidence: bundle.patternEvidence,
      subject: { accountId: 'music-tools-x' },
      platform: 'x',
      meta: {
        schemaVersion: 1,
        producer: 'sns-growth-bridge',
        producedAt: CONTEXT.producedAt,
        traceId: CONTEXT.traceId,
      },
      strategyId: 'sns-ai:strategy:music-tools-x:dry',
      inputsDigest: 'dry-integration',
      matureCheckpointMinutes: 1440,
    });
    expect(canonical.subject.accountId).toBe('music-tools-x');
    expect(canonical.subject.creatorId).toBeUndefined();
    expect(canonical.subject.workspaceId).toBeUndefined();
  });
});

describe('runtime policy', () => {
  it('records SNS-AI manual-only invariants without mutating SNS-AI', () => {
    expect(SNS_AI_RUNTIME_POLICY_INVARIANTS.manualOnly).toBe(true);
    expect(SNS_AI_RUNTIME_POLICY_INVARIANTS.allowAutomaticAccountActivation).toBe(false);
    expect(SNS_AI_RUNTIME_POLICY_INVARIANTS.allowAutomaticEngagement).toBe(false);
    expect(SNS_AI_RUNTIME_POLICY_INVARIANTS.allowScheduledProviderPolling).toBe(false);
    expect(PACKAGE_PHASE).toBe(6);
    expect(SNS_AI_METRIC_SNAPSHOT_STATUS).toBe('implemented');
  });
});
