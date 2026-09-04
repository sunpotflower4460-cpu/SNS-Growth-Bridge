import { describe, expect, it } from 'vitest';

import { adaptMySnsDraftRevisionToHumanCorrection } from './correction.js';
import { AdapterReason } from './result.js';
import { CONTEXT, revision } from './test-utils.js';

describe('adaptMySnsDraftRevisionToHumanCorrection', () => {
  it('maps a body edit', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision(), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.eventId).toBe('my-sns:human-correction:rev_1');
    expect(result.value.subject).toEqual({ workspaceId: 'ws_fixture_1' });
    expect(result.value.platform).toBe('x');
    expect(result.value.draftId).toBe('draft_1');
    expect(result.value.revisionId).toBe('rev_1');
    expect(result.value.seedId).toBe('seed_1');
    expect(result.value.aiGenerationId).toBe('gen_1');
    expect(result.value.changedFields).toEqual(['body']);
    expect(result.value.before.body).toBe('AI original body');
    expect(result.value.after.body).toBe('Approved body');
  });

  it('maps a title edit', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        title: 'New title',
        body: 'Same',
        aiOriginalSnapshot: { title: 'Old title', body: 'Same', hashtags: ['music'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.changedFields).toEqual(['title']);
  });

  it('maps a CTA edit', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        body: 'Same',
        cta: 'Please listen',
        aiOriginalSnapshot: { title: 'Hello', body: 'Same', hashtags: ['music'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.changedFields).toEqual(['cta']);
  });

  it('maps a hashtag-set change', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        body: 'Same',
        hashtags: ['keep'],
        aiOriginalSnapshot: { title: 'Hello', body: 'Same', hashtags: ['keep', 'drop'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.changedFields).toEqual(['hashtags']);
    expect(result.value.before.hashtags).toEqual(['keep', 'drop']);
    expect(result.value.after.hashtags).toEqual(['keep']);
  });

  it('maps multiple changed fields', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        title: 'New',
        body: 'New body',
        hashtags: ['b'],
        cta: 'Go',
        aiOriginalSnapshot: { title: 'Old', body: 'Old body', hashtags: ['a'], cta: 'Stay' },
      }),
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.changedFields.sort()).toEqual(['body', 'cta', 'hashtags', 'title']);
  });

  it('maps a body whitespace-only change as a correction', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        body: 'hello',
        aiOriginalSnapshot: { title: 'Hello', body: 'hello ', hashtags: ['music'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.changedFields).toEqual(['body']);
  });

  it('skips unedited approval', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        body: 'Same',
        aiOriginalSnapshot: { title: 'Hello', body: 'Same', hashtags: ['music'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.uneditedApproval });
  });

  it('skips template revisions', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision({ source: 'template' }), CONTEXT);
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.templateRevision });
  });

  it('skips missing AI original snapshot without inventing one', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision({ aiOriginalSnapshot: undefined }), CONTEXT);
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.missingAiOriginalSnapshot });
  });

  it('skips hashtag reorder only', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        body: 'Same',
        hashtags: ['b', 'a'],
        aiOriginalSnapshot: { title: 'Hello', body: 'Same', hashtags: ['a', 'b'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.uneditedApproval });
  });

  it('skips title trim-only (" Hello " vs "Hello")', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        title: 'Hello',
        body: 'Same',
        aiOriginalSnapshot: { title: ' Hello ', body: 'Same', hashtags: ['music'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.uneditedApproval });
  });

  it('skips blank title vs undefined', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        title: undefined,
        body: 'Same',
        aiOriginalSnapshot: { title: '   ', body: 'Same', hashtags: ['music'], cta: 'Listen' },
      }),
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.uneditedApproval });
  });

  it('skips CTA trim-only (" Listen " vs "Listen")', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(
      revision({
        body: 'Same',
        cta: 'Listen',
        aiOriginalSnapshot: { title: 'Hello', body: 'Same', hashtags: ['music'], cta: ' Listen ' },
      }),
      CONTEXT,
    );
    expect(result).toEqual({ status: 'not-applicable', reason: AdapterReason.uneditedApproval });
  });

  it('does not cap events to a generation-context limit', () => {
    const first = adaptMySnsDraftRevisionToHumanCorrection(revision({ id: 'rev_a' }), CONTEXT);
    const second = adaptMySnsDraftRevisionToHumanCorrection(revision({ id: 'rev_b' }), CONTEXT);
    const third = adaptMySnsDraftRevisionToHumanCorrection(revision({ id: 'rev_c' }), CONTEXT);
    const fourth = adaptMySnsDraftRevisionToHumanCorrection(revision({ id: 'rev_d' }), CONTEXT);
    expect([first, second, third, fourth].every((row) => row.status === 'mapped')).toBe(true);
  });

  it('does not invent creatorId', () => {
    const result = adaptMySnsDraftRevisionToHumanCorrection(revision(), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.subject.creatorId).toBeUndefined();
  });

  it('does not mutate input', () => {
    const source = revision();
    const before = structuredClone(source);
    adaptMySnsDraftRevisionToHumanCorrection(source, CONTEXT);
    expect(source).toEqual(before);
  });

  it('is deterministic', () => {
    const source = revision();
    expect(adaptMySnsDraftRevisionToHumanCorrection(source, CONTEXT)).toEqual(
      adaptMySnsDraftRevisionToHumanCorrection(source, CONTEXT),
    );
  });
});
