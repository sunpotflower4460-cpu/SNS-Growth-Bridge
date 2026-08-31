import { describe, expect, it } from 'vitest';

import {
  CURRENT_SCHEMA_VERSION,
  parseEnvelopeMeta,
  parseExperimentDefinition,
  parseGrowthStrategySnapshot,
  parseGrowthSubjectRef,
  parseHumanPreferenceSummary,
  parseRawMetricVector,
} from './index.js';
import { creatorActionRecommendationSchema } from './creator-action.js';
import { envelopeMetaSchema } from './envelope.js';
import { parseContract } from './parse.js';
import { expectContractError } from './test-utils.js';

describe('schema and identity policy', () => {
  it('strips unknown keys instead of treating ownerId as creatorId', () => {
    const parsed = parseGrowthSubjectRef({
      workspaceId: 'ws_fixture_1',
      ownerId: 'user_should_not_become_creator',
      createdBy: 'seed_author',
    });
    expect(parsed).toEqual({ workspaceId: 'ws_fixture_1' });
    expect(parsed).not.toHaveProperty('ownerId');
    expect(parsed).not.toHaveProperty('createdBy');
    expect(parsed.creatorId).toBeUndefined();
  });

  it('strips additive unknown fields on EnvelopeMeta within major 1', () => {
    const parsed = parseContract('EnvelopeMeta', envelopeMetaSchema, {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      producer: 'sns-growth-bridge',
      producedAt: '2026-08-01T12:00:00.000Z',
      traceId: 'trace_extra_field',
      futureOptional: 'ignored-by-this-reader',
    });
    expect(parsed).toEqual({
      schemaVersion: 1,
      producer: 'sns-growth-bridge',
      producedAt: '2026-08-01T12:00:00.000Z',
      traceId: 'trace_extra_field',
    });
  });

  it('rejects NaN and Infinity metrics (not representable in JSON fixtures)', () => {
    expectContractError(() => parseRawMetricVector({ likes: Number.NaN }));
    expectContractError(() => parseRawMetricVector({ likes: Number.POSITIVE_INFINITY }));
    expectContractError(() => parseRawMetricVector({ likes: Number.NEGATIVE_INFINITY }));
    expectContractError(() => parseRawMetricVector({ impressions: Number.NaN }));
  });

  it('rejects high confidence when evidenceCount is 0', () => {
    expectContractError(() =>
      parseContract('CreatorActionRecommendation', creatorActionRecommendationSchema, {
        meta: {
          schemaVersion: 1,
          producer: 'sns-growth-bridge',
          producedAt: '2026-08-15T09:00:00.000Z',
          traceId: 'trace_low_evidence_high_confidence',
        },
        recommendationId: 'car_fake_confidence',
        subject: { workspaceId: 'ws_fixture_1' },
        type: 'information_request',
        objective: 'clarify_available_assets',
        priority: 'low',
        confidence: 0.9,
        generatedAt: '2026-08-15T09:00:00.000Z',
        rationale: {
          summary: 'No observations yet.',
          evidenceCount: 0,
          observations: [],
        },
        requestedAction: {
          kind: 'information_request',
          questions: ['Which songs have reusable clips?'],
        },
        relatedPostIds: [],
      }),
    );
  });

  it('accepts ISO 8601 datetimes with a numeric offset', () => {
    const parsed = parseEnvelopeMeta({
      schemaVersion: 1,
      producer: 'sns-growth-bridge',
      producedAt: '2026-08-01T21:00:00+09:00',
      traceId: 'trace_offset_datetime',
    });
    expect(parsed.producedAt).toBe('2026-08-01T21:00:00+09:00');
  });

  it('rejects active GrowthStrategySnapshot with sampleSize 0', () => {
    expectContractError(() =>
      parseGrowthStrategySnapshot({
        meta: {
          schemaVersion: 1,
          producer: 'sns-growth-bridge',
          producedAt: '2026-08-10T00:00:00.000Z',
          traceId: 'trace_active_empty',
        },
        strategyId: 'strategy_active_empty',
        strategyVersion: '1',
        subject: { accountId: 'acct_example_x' },
        platform: 'x',
        generatedAt: '2026-08-10T00:00:00.000Z',
        sourceWindow: {
          from: '2026-07-11T00:00:00.000Z',
          to: '2026-08-10T00:00:00.000Z',
          strategyWindowDays: 30,
          matureCheckpointMinutes: 1440,
        },
        sampleSize: 0,
        overallScore: 0,
        confidence: 0.4,
        exploreRate: 0.1,
        preferred: [],
        avoid: [],
        inputsDigest: 'sha256:fixture-active-empty',
        status: 'active',
      }),
    );
  });

  it('rejects preferred patterns with sampleSize 0', () => {
    expectContractError(() =>
      parseGrowthStrategySnapshot({
        meta: {
          schemaVersion: 1,
          producer: 'sns-growth-bridge',
          producedAt: '2026-08-10T00:00:00.000Z',
          traceId: 'trace_zero_sample_pattern',
        },
        strategyId: 'strategy_zero_pattern',
        strategyVersion: '1',
        subject: { accountId: 'acct_example_x' },
        platform: 'x',
        generatedAt: '2026-08-10T00:00:00.000Z',
        sourceWindow: {
          from: '2026-07-11T00:00:00.000Z',
          to: '2026-08-10T00:00:00.000Z',
          strategyWindowDays: 30,
          matureCheckpointMinutes: 1440,
        },
        sampleSize: 4,
        overallScore: 55,
        confidence: 0.6,
        exploreRate: 0.1,
        preferred: [
          {
            dimension: 'hook',
            value: 'first-person',
            sampleSize: 0,
            averageScore: 70,
            lift: 10,
            confidence: 0.5,
            rationale: 'No samples.',
            evidencePostIds: [],
          },
        ],
        avoid: [],
        inputsDigest: 'sha256:fixture-zero-pattern',
        status: 'active',
      }),
    );
  });

  it('rejects ExperimentDefinition with identical control and variant', () => {
    expectContractError(() =>
      parseExperimentDefinition({
        meta: {
          schemaVersion: 1,
          producer: 'sns-growth-bridge',
          producedAt: '2026-08-10T00:00:00.000Z',
          traceId: 'trace_same_arms',
        },
        experimentId: 'exp_same_arms',
        subject: { accountId: 'acct_example_x' },
        platform: 'x',
        dimension: 'hook',
        control: 'question',
        variant: 'question',
        startedAt: '2026-08-10T00:00:00.000Z',
        status: 'planned',
      }),
    );
  });

  it('rejects HumanPreferenceSummary patterns without matching source counts', () => {
    expectContractError(() =>
      parseHumanPreferenceSummary({
        meta: {
          schemaVersion: 1,
          producer: 'sns-growth-bridge',
          producedAt: '2026-08-10T00:00:00.000Z',
          traceId: 'trace_pref_no_source',
        },
        summaryId: 'pref_no_source',
        subject: { workspaceId: 'ws_fixture_1' },
        generatedAt: '2026-08-10T00:00:00.000Z',
        sourceCorrectionCount: 0,
        explicitFeedbackCount: 0,
        preferences: [
          {
            type: 'prefer',
            value: 'first-person',
            confidence: 0.8,
            source: 'explicit',
            rationale: 'Invented without evidence.',
          },
        ],
      }),
    );
  });
});
