import { describe, expect, it } from 'vitest';

import { adaptMySnsPublishedPost } from './published-post.js';
import { AdapterReason } from './result.js';
import { attempt, CONTEXT, job, publishedRevision } from './test-utils.js';

describe('adaptMySnsPublishedPost', () => {
  it('maps a confirmed API publish with externalPostId', () => {
    const result = adaptMySnsPublishedPost(
      { job: job(), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.postId).toBe('my-sns:publish-job:job_1');
    expect(result.value.subject).toEqual({ workspaceId: 'ws_fixture_1' });
    expect(result.value.platform).toBe('x');
    expect(result.value.externalPostId).toBe('ext_123');
    expect(result.value.externalUrl).toBe('https://example.invalid/status/ext_123');
    expect(result.value.publishedAt).toBe('2026-09-03T08:00:00.000Z');
    expect(result.value.text).toBe('Published body only');
    expect(result.value.media).toEqual([]);
    expect(result.value.features).toEqual({});
    expect(result.value.experimentAssignment).toBeUndefined();
    expect(result.value.subject.accountId).toBeUndefined();
  });

  it('maps manual publish success without externalPostId', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job({ channel: 'note' }),
        attempts: [attempt({ externalPostId: undefined, externalUrl: undefined })],
        revision: publishedRevision({ channel: 'note' }),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.platform).toBe('note');
    expect(result.value.externalPostId).toBeUndefined();
    expect(result.value.externalUrl).toBeUndefined();
  });

  it('maps success with externalUrl only', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [attempt({ externalPostId: undefined, externalUrl: 'https://example.invalid/post' })],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.externalPostId).toBeUndefined();
    expect(result.value.externalUrl).toBe('https://example.invalid/post');
  });

  it('does not concatenate title/hashtags/CTA into text', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [attempt()],
        revision: publishedRevision({ title: 'Title', body: 'Body only', hashtags: ['tag'], cta: 'CTA' }),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.text).toBe('Body only');
    expect(result.value.text).not.toContain('Title');
    expect(result.value.text).not.toContain('CTA');
  });

  it('skips scheduled jobs', () => {
    const result = adaptMySnsPublishedPost(
      { job: job({ status: 'scheduled' }), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.jobNotPublished });
  });

  it('skips failed jobs', () => {
    const result = adaptMySnsPublishedPost(
      { job: job({ status: 'failed' }), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.jobNotPublished });
  });

  it('skips published jobs with no success attempt', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [attempt({ status: 'failed', externalPostId: 'do-not-use' })],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.noSuccessAttempt });
  });

  it('skips success attempts when the job is not published', () => {
    const result = adaptMySnsPublishedPost(
      { job: job({ status: 'failed' }), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result.status).toBe('not-applicable');
  });

  it('does not use failed-attempt external ids', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [
          attempt({
            id: 'failed',
            attemptNumber: 1,
            status: 'failed',
            externalPostId: 'failed_id',
            createdAt: '2026-09-03T07:00:00.000Z',
          }),
          attempt({
            id: 'ok',
            attemptNumber: 2,
            status: 'success',
            externalPostId: 'success_id',
            createdAt: '2026-09-03T08:00:00.000Z',
          }),
        ],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.externalPostId).toBe('success_id');
  });

  it('selects the success attempt with the highest attemptNumber, then newest createdAt', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [
          attempt({
            id: 'older-high',
            attemptNumber: 2,
            externalPostId: 'older_high',
            createdAt: '2026-09-03T07:00:00.000Z',
          }),
          attempt({
            id: 'newer-low',
            attemptNumber: 1,
            externalPostId: 'newer_low',
            createdAt: '2026-09-03T09:00:00.000Z',
          }),
          attempt({
            id: 'newer-high',
            attemptNumber: 2,
            externalPostId: 'newer_high',
            createdAt: '2026-09-03T08:30:00.000Z',
          }),
        ],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.externalPostId).toBe('newer_high');
  });

  it('blocks missing publishedAt without falling back to attempt createdAt', () => {
    const result = adaptMySnsPublishedPost(
      { job: job({ publishedAt: undefined }), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.missingPublishedAt });
  });

  it('blocks cross-workspace revision joins', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [attempt()],
        revision: publishedRevision({ workspaceId: 'ws_other' }),
      },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.crossWorkspace });
  });

  it('blocks when a same-job attempt belongs to another workspace', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [attempt({ workspaceId: 'ws_other' })],
        revision: publishedRevision(),
      },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.crossWorkspace });
  });

  it('blocks join integrity mismatches', () => {
    const result = adaptMySnsPublishedPost(
      {
        job: job(),
        attempts: [attempt()],
        revision: publishedRevision({ id: 'rev_other' }),
      },
      CONTEXT,
    );
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.joinIntegrity });
  });

  it('blocks missing revision', () => {
    const result = adaptMySnsPublishedPost({ job: job(), attempts: [attempt()] }, CONTEXT);
    expect(result).toEqual({ status: 'blocked', reason: AdapterReason.missingRevision });
  });

  it('does not map socialAccountId to accountId', () => {
    const result = adaptMySnsPublishedPost(
      { job: job({ socialAccountId: 'social_acct_should_not_map' }), attempts: [attempt()], revision: publishedRevision() },
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.subject.accountId).toBeUndefined();
    expect(JSON.stringify(result.value)).not.toContain('social_acct_should_not_map');
  });

  it('does not mutate input', () => {
    const input = { job: job(), attempts: [attempt()], revision: publishedRevision() };
    const before = structuredClone(input);
    adaptMySnsPublishedPost(input, CONTEXT);
    expect(input).toEqual(before);
  });

  it('is deterministic', () => {
    const input = { job: job(), attempts: [attempt()], revision: publishedRevision() };
    expect(adaptMySnsPublishedPost(input, CONTEXT)).toEqual(adaptMySnsPublishedPost(input, CONTEXT));
  });
});
