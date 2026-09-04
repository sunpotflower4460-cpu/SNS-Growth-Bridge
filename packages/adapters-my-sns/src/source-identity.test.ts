import { describe, expect, it } from 'vitest';

import { adaptMySnsBrandProfile } from './brand-profile.js';
import { adaptMySnsDraftRevisionToHumanCorrection } from './correction.js';
import { adaptMySnsPublishedPost } from './published-post.js';
import { AdapterReason } from './result.js';
import { isIsoDateTimeSource, isNonEmptySourceId } from './source-identity.js';
import { attempt, brandProfile, CONTEXT, job, publishedRevision, revision } from './test-utils.js';

describe('source identity helpers', () => {
  it('rejects empty and whitespace-only source ids', () => {
    expect(isNonEmptySourceId('')).toBe(false);
    expect(isNonEmptySourceId('   ')).toBe(false);
    expect(isNonEmptySourceId('bp_123')).toBe(true);
  });

  it('requires Canonical-compatible ISO datetimes with offset', () => {
    expect(isIsoDateTimeSource('2026-09-03T10:00:00.000Z')).toBe(true);
    expect(isIsoDateTimeSource('2026-08-01T21:00:00+09:00')).toBe(true);
    expect(isIsoDateTimeSource('')).toBe(false);
    expect(isIsoDateTimeSource('not-a-date')).toBe(false);
    expect(isIsoDateTimeSource('2026-09-03')).toBe(false);
    expect(isIsoDateTimeSource('2026-09-03T10:00:00')).toBe(false);
  });

  it('documents that prefixing would launder empty source ids past Canonical nonEmptyString', () => {
    const emptyId = '';
    const updatedAt = '2026-09-03T10:00:00.000Z';
    expect(`my-sns:${emptyId}:${updatedAt}`).toBe('my-sns::2026-09-03T10:00:00.000Z');
    expect(`my-sns:publish-job:${emptyId}`).toBe('my-sns:publish-job:');
    expect('my-sns::2026-09-03T10:00:00.000Z'.trim().length).toBeGreaterThan(0);
    expect('my-sns:publish-job:'.trim().length).toBeGreaterThan(0);
  });
});

describe('adapter-boundary source identity', () => {
  it('blocks empty BrandProfile.id instead of emitting my-sns::…', () => {
    const result = adaptMySnsBrandProfile(brandProfile({ id: '' }), CONTEXT);
    expect(result).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: BrandProfile.id`,
    });
  });

  it('blocks whitespace-only BrandProfile.id', () => {
    const result = adaptMySnsBrandProfile(brandProfile({ id: '   ' }), CONTEXT);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason).toBe(`${AdapterReason.invalidSourceIdentity}: BrandProfile.id`);
  });

  it('blocks missing or invalid BrandProfile.updatedAt instead of embedding it in profileVersion', () => {
    expect(adaptMySnsBrandProfile(brandProfile({ updatedAt: '' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: BrandProfile.updatedAt`,
    });
    expect(adaptMySnsBrandProfile(brandProfile({ updatedAt: 'not-a-date' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: BrandProfile.updatedAt`,
    });
    expect(adaptMySnsBrandProfile(brandProfile({ updatedAt: '2026-09-03' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: BrandProfile.updatedAt`,
    });
    expect(adaptMySnsBrandProfile(brandProfile({ updatedAt: '2026-09-03T10:00:00' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: BrandProfile.updatedAt`,
    });
  });

  it('blocks empty PublishJob.id instead of emitting my-sns:publish-job:', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job({ id: '' }),
        attempts: [attempt({ publishJobId: '' })],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: PublishJob.id`,
    });
  });

  it('blocks whitespace-only PublishJob.id', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job({ id: '   ' }),
        attempts: [attempt({ publishJobId: '   ' })],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason).toBe(`${AdapterReason.invalidSourceIdentity}: PublishJob.id`);
  });
});

describe('Canonical identity/provenance already fail-closed without prefixing', () => {
  it('rejects empty BrandProfile.workspaceId via Canonical subject.workspaceId', () => {
    const result = adaptMySnsBrandProfile(brandProfile({ workspaceId: '' }), CONTEXT);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${AdapterReason.canonicalValidationFailed}:`)).toBe(true);
  });

  it('rejects empty DraftRevision.id via Canonical revisionId even though eventId would be prefixed', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision({ id: '' }), CONTEXT);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${AdapterReason.canonicalValidationFailed}:`)).toBe(true);
  });

  it('rejects empty DraftRevision.socialDraftId via Canonical draftId', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision({ socialDraftId: '' }), CONTEXT);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${AdapterReason.canonicalValidationFailed}:`)).toBe(true);
  });

  it('rejects invalid DraftRevision.createdAt via Canonical occurredAt', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision({ createdAt: 'not-a-date' }), CONTEXT);
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${AdapterReason.canonicalValidationFailed}:`)).toBe(true);
  });

  it('rejects invalid PublishJob.publishedAt via Canonical publishedAt', () => {
    const result = adaptMySnsPublishedPost(
      { job: job({ publishedAt: 'not-a-date' }), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') {
      return;
    }
    expect(result.reason.startsWith(`${AdapterReason.canonicalValidationFailed}:`)).toBe(true);
  });
});
