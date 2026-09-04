import { describe, expect, it } from 'vitest';

import {
  CURRENT_SCHEMA_VERSION,
  PACKAGE_PHASE,
  parseCreatorActionRecommendation,
  parseCrossProductAccountLink,
  parseEnvelopeMeta,
  parseGrowthStrategySnapshot,
  parseGrowthSubjectRef,
  parseHumanAnchorEvent,
  parseHumanCorrectionEvent,
  parseMetricSnapshot,
  parseOrbitPlan,
  parsePublishedPostSnapshot,
  parseRawMetricVector,
  parseScheduleAdjustmentRecommendation,
} from './index.js';
import { expectContractError, loadJsonFixture } from './test-utils.js';

describe('positive contract fixtures', () => {
  it('keeps the contracts package on Phase 2 schema major 1', () => {
    expect(PACKAGE_PHASE).toBe(2);
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });

  it('accepts GrowthSubjectRef with creatorId only', () => {
    expect(parseGrowthSubjectRef(loadJsonFixture('positive', 'growth-subject-creator-only.json'))).toEqual({
      creatorId: 'creator_fixture_1',
    });
  });

  it('accepts GrowthSubjectRef with workspaceId only', () => {
    expect(parseGrowthSubjectRef(loadJsonFixture('positive', 'growth-subject-workspace-only.json'))).toEqual({
      workspaceId: 'ws_fixture_1',
    });
  });

  it('accepts GrowthSubjectRef with accountId only', () => {
    expect(parseGrowthSubjectRef(loadJsonFixture('positive', 'growth-subject-account-only.json'))).toEqual({
      accountId: 'acct_example_x',
    });
  });

  it('accepts CrossProductAccountLink without inventing creatorId', () => {
    const parsed = parseCrossProductAccountLink(loadJsonFixture('positive', 'cross-product-account-link.json'));
    expect(parsed.confirmation).toBe('explicit-operator');
    expect(parsed.mySns.workspaceId).toBe('ws_fixture');
    expect(parsed.snsAi.accountId).toBe('artist-x-fixture');
    expect(JSON.stringify(parsed)).not.toContain('creatorId');
  });

  it('accepts a real HumanCorrectionEvent (AI draft edited on title/body/CTA/hashtag set)', () => {
    const parsed = parseHumanCorrectionEvent(loadJsonFixture('positive', 'human-correction-valid.json'));
    expect(parsed.changedFields).toEqual(['title', 'body', 'hashtags', 'cta']);
    expect(parsed.subject.workspaceId).toBe('ws_fixture_1');
    expect(parsed.before.body).not.toBe(parsed.after.body);
  });

  it('accepts RawMetricVector including likes as raw preservation', () => {
    const parsed = parseRawMetricVector(loadJsonFixture('positive', 'raw-metric-vector-valid.json'));
    expect(parsed.likes).toBe(42);
    expect(parsed.reelSkipRate).toBe(0.21);
  });

  it('accepts the Aquarium asset_request CreatorActionRecommendation', () => {
    const parsed = parseCreatorActionRecommendation(
      loadJsonFixture('positive', 'creator-action-aquarium-asset-request.json'),
    );
    expect(parsed.type).toBe('asset_request');
    expect(parsed.objective).toBe('increase_profile_to_music_conversion');
    expect(parsed.confidence).toBe(0.78);
    expect(parsed.requestedAction).toMatchObject({
      kind: 'asset_request',
      songOrSubject: 'Aquarium',
      mediaType: 'video',
      orientation: 'vertical',
      durationSeconds: { min: 20, max: 30 },
      framing: ['medium', 'close'],
      quantity: 2,
    });
    expect(parsed.rationale.summary.length).toBeGreaterThan(0);
    expect(parsed.rationale.evidenceCount).toBe(11);
  });

  it('accepts the Re:trip HumanAnchorEvent', () => {
    const parsed = parseHumanAnchorEvent(loadJsonFixture('positive', 'human-anchor-retrip.json'));
    expect(parsed.platform).toBe('x');
    expect(parsed.source).toBe('my-sns-manual');
    expect(parsed.confidence).toBe(1);
    expect(parsed.summary).toBe('Creator manually posted a recent Re:trip performance.');
    expect(parsed.entities).toEqual([{ type: 'song', value: 'Re:trip' }]);
  });

  it('accepts the Re:trip OrbitPlan with supporting orbit items', () => {
    const parsed = parseOrbitPlan(loadJsonFixture('positive', 'orbit-plan-retrip.json'));
    expect(parsed.anchorId).toBe('anchor_retrip_manual_1');
    expect(parsed.orbitItems.map((item) => item.type)).toEqual([
      'alternate_asset',
      'story_context',
      'lyric_context',
      'behind_the_scenes',
    ]);
    expect(parsed.orbitItems.every((item) => item.requiresApproval)).toBe(true);
    expect(parsed.scheduleAdjustments?.[0]?.action).toBe('replace');
  });

  it('accepts a replace ScheduleAdjustmentRecommendation', () => {
    const parsed = parseScheduleAdjustmentRecommendation(
      loadJsonFixture('positive', 'schedule-adjustment-replace.json'),
    );
    expect(parsed.action).toBe('replace');
    expect(parsed.targetScheduleId).toBe('sched_retrip_promo_1');
    expect(parsed.replacementConcept).toBeTruthy();
    expect(parsed.reason).toMatch(/duplicate/i);
  });

  it('accepts a My-SNS manual PublishedPostSnapshot without externalPostId', () => {
    const parsed = parsePublishedPostSnapshot(
      loadJsonFixture('positive', 'published-post-manual-no-external-id.json'),
    );
    expect(parsed.postId).toBe('post_retrip_manual_1');
    expect(parsed.externalPostId).toBeUndefined();
    expect(parsed.subject.workspaceId).toBe('ws_fixture_1');
    expect(parsed.meta.producer).toBe('my-sns');
  });

  it('accepts an insufficient-evidence GrowthStrategySnapshot', () => {
    const parsed = parseGrowthStrategySnapshot(
      loadJsonFixture('positive', 'growth-strategy-insufficient-evidence.json'),
    );
    expect(parsed.status).toBe('insufficient-evidence');
    expect(parsed.sampleSize).toBe(0);
    expect(parsed.confidence).toBe(0);
    expect(parsed.preferred).toEqual([]);
    expect(parsed.avoid).toEqual([]);
  });
});

describe('negative contract fixtures', () => {
  it('rejects GrowthSubjectRef with no identity', () => {
    const error = expectContractError(() =>
      parseGrowthSubjectRef(loadJsonFixture('negative', 'growth-subject-no-identity.json')),
    );
    expect(error.message).toMatch(/at least one/i);
  });

  it('rejects empty creatorId', () => {
    expectContractError(() =>
      parseGrowthSubjectRef(loadJsonFixture('negative', 'growth-subject-empty-creator-id.json')),
    );
  });

  it('rejects a negative metric', () => {
    expectContractError(() => parseRawMetricVector(loadJsonFixture('negative', 'raw-metric-negative.json')));
  });

  it('rejects reelSkipRate below 0', () => {
    expectContractError(() =>
      parseRawMetricVector(loadJsonFixture('negative', 'raw-metric-reel-skip-rate-below.json')),
    );
  });

  it('rejects reelSkipRate above 1', () => {
    expectContractError(() =>
      parseRawMetricVector(loadJsonFixture('negative', 'raw-metric-reel-skip-rate-above.json')),
    );
  });

  it('rejects an unsupported platform', () => {
    const error = expectContractError(() =>
      parseMetricSnapshot(loadJsonFixture('negative', 'unsupported-platform.json')),
    );
    expect(error.message).toMatch(/platform/i);
  });

  it('rejects an unsupported schema major', () => {
    const error = expectContractError(() =>
      parseEnvelopeMeta(loadJsonFixture('negative', 'unsupported-schema-major.json')),
    );
    expect(error.message).toMatch(/unsupported schema major/i);
  });

  it('rejects HumanCorrectionEvent with empty changedFields', () => {
    expectContractError(() =>
      parseHumanCorrectionEvent(loadJsonFixture('negative', 'human-correction-empty-changed-fields.json')),
    );
  });

  it('rejects unedited AI approval as HumanCorrectionEvent', () => {
    expectContractError(() =>
      parseHumanCorrectionEvent(loadJsonFixture('negative', 'human-correction-unedited-approval.json')),
    );
  });

  it('rejects hashtag-order-only changes as HumanCorrectionEvent', () => {
    expectContractError(() =>
      parseHumanCorrectionEvent(loadJsonFixture('negative', 'human-correction-hashtag-order-only.json')),
    );
  });

  it('rejects AssetRequest quantity 0', () => {
    expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'asset-request-quantity-0.json')),
    );
  });

  it('rejects duration min > max', () => {
    expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'duration-min-gt-max.json')),
    );
  });

  it('rejects recommendation type / requestedAction.kind mismatch', () => {
    const error = expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'recommendation-type-action-mismatch.json')),
    );
    expect(error.message).toMatch(/must match/i);
  });

  it('rejects confidence below 0', () => {
    expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'confidence-below-zero.json')),
    );
  });

  it('rejects confidence above 1', () => {
    expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'confidence-above-one.json')),
    );
  });

  it('rejects an empty rationale summary', () => {
    expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'empty-rationale-summary.json')),
    );
  });

  it('rejects an unknown HumanAnchor source', () => {
    expectContractError(() =>
      parseHumanAnchorEvent(loadJsonFixture('negative', 'human-anchor-unknown-source.json')),
    );
  });

  it('rejects HumanAnchorEvent with neither publishedPostId nor externalPostId', () => {
    const error = expectContractError(() =>
      parseHumanAnchorEvent(loadJsonFixture('negative', 'human-anchor-missing-post-ids.json')),
    );
    expect(error.message).toMatch(/publishedPostId or externalPostId/i);
  });

  it('rejects external-confirmed HumanAnchorEvent without externalPostId', () => {
    const error = expectContractError(() =>
      parseHumanAnchorEvent(
        loadJsonFixture('negative', 'human-anchor-external-confirmed-missing-external-id.json'),
      ),
    );
    expect(error.message).toMatch(/externalPostId/i);
  });

  it('rejects OrbitPlan with empty anchorId', () => {
    expectContractError(() => parseOrbitPlan(loadJsonFixture('negative', 'orbit-plan-empty-anchor-id.json')));
  });

  it('rejects an unknown ScheduleAdjustment action', () => {
    expectContractError(() =>
      parseScheduleAdjustmentRecommendation(loadJsonFixture('negative', 'schedule-adjustment-unknown-action.json')),
    );
  });

  it('rejects ScheduleAdjustmentRecommendation without targetScheduleId', () => {
    expectContractError(() =>
      parseScheduleAdjustmentRecommendation(loadJsonFixture('negative', 'schedule-adjustment-missing-target.json')),
    );
  });

  it('rejects replace ScheduleAdjustmentRecommendation without replacementConcept', () => {
    const error = expectContractError(() =>
      parseScheduleAdjustmentRecommendation(
        loadJsonFixture('negative', 'schedule-adjustment-replace-missing-concept.json'),
      ),
    );
    expect(error.message).toMatch(/replacementConcept/i);
  });

  it('rejects MetricSnapshot without required externalPostId', () => {
    expectContractError(() =>
      parseMetricSnapshot(loadJsonFixture('negative', 'metric-snapshot-missing-external-post-id.json')),
    );
  });

  it('rejects inverted evidenceWindow', () => {
    const error = expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'evidence-window-from-after-to.json')),
    );
    expect(error.message).toMatch(/evidenceWindow\.from/i);
  });

  it('rejects expiresAt before generatedAt', () => {
    const error = expectContractError(() =>
      parseCreatorActionRecommendation(loadJsonFixture('negative', 'expires-at-before-generated-at.json')),
    );
    expect(error.message).toMatch(/expiresAt/i);
  });

  it('rejects inverted GrowthStrategy sourceWindow', () => {
    const error = expectContractError(() =>
      parseGrowthStrategySnapshot(loadJsonFixture('negative', 'growth-strategy-source-window-inverted.json')),
    );
    expect(error.message).toMatch(/sourceWindow\.from/i);
  });

  it('rejects overallScore outside 0..100', () => {
    expectContractError(() =>
      parseGrowthStrategySnapshot(loadJsonFixture('negative', 'growth-strategy-score-out-of-range.json')),
    );
  });

  it('rejects CrossProductAccountLink with empty workspaceId', () => {
    expectContractError(() =>
      parseCrossProductAccountLink(loadJsonFixture('negative', 'cross-product-account-link-empty-workspace.json')),
    );
  });
});
