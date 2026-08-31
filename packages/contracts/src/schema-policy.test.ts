import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, parseGrowthSubjectRef, parseRawMetricVector } from './index.js';
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
});
