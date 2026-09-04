import { describe, expect, it } from 'vitest';

import { adaptSnsAiHumanFeedback, feedbackEventId } from './feedback.js';
import { AdapterReason } from './result.js';
import { CONTEXT, feedbackRow } from './test-utils.js';

describe('adaptSnsAiHumanFeedback', () => {
  it.each(['prefer', 'avoid', 'correct', 'pin', 'note'] as const)('maps action %s without rewriting it', (action) => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ action, note: `${action} note` }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.action).toBe(action);
    expect(result.value.note).toBe(`${action} note`);
  });

  it('preserves active:false instead of dropping the event', () => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ active: false }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.active).toBe(false);
  });

  it('omits dimension when absent', () => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ dimension: null }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.dimension).toBeUndefined();
  });

  it('omits empty or whitespace value', () => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ value: '   ' }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.value).toBeUndefined();
  });

  it('maps a known Canonical dimension', () => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ dimension: 'hook', value: 'question' }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.dimension).toBe('hook');
    expect(result.value.value).toBe('question');
  });

  it('blocks unknown dimension instead of passing it through as a string', () => {
    expect(adaptSnsAiHumanFeedback(feedbackRow({ dimension: 'trendUsed' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: AdapterReason.unknownFeedbackDimension,
    });
  });

  it('blocks empty account', () => {
    expect(adaptSnsAiHumanFeedback(feedbackRow({ account: '' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceIdentity}: account`,
    });
  });

  it('blocks empty note', () => {
    expect(adaptSnsAiHumanFeedback(feedbackRow({ note: '  ' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: AdapterReason.emptyFeedbackNote,
    });
  });

  it('blocks invalid timestamp', () => {
    expect(adaptSnsAiHumanFeedback(feedbackRow({ at: '2026-09-03' }), CONTEXT)).toEqual({
      status: 'blocked',
      reason: `${AdapterReason.invalidSourceDatetime}: at`,
    });
  });

  it('does not project correct onto HumanCorrectionEvent', () => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ action: 'correct' }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value.action).toBe('correct');
    expect(result.value).not.toHaveProperty('before');
    expect(result.value).not.toHaveProperty('after');
    expect(result.value).not.toHaveProperty('changedFields');
    expect(result.value).not.toHaveProperty('revisionId');
  });

  it('discards SNS-AI source field', () => {
    const result = adaptSnsAiHumanFeedback(feedbackRow({ source: 'operator' }), CONTEXT);
    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') {
      return;
    }
    expect(result.value).not.toHaveProperty('source');
    expect(JSON.stringify(result.value)).not.toContain('operator');
  });

  it('is deterministic and changes eventId when note changes', () => {
    const first = adaptSnsAiHumanFeedback(feedbackRow({ note: 'A' }), CONTEXT);
    const again = adaptSnsAiHumanFeedback(feedbackRow({ note: 'A' }), CONTEXT);
    const changed = adaptSnsAiHumanFeedback(feedbackRow({ note: 'B' }), CONTEXT);
    expect(first).toEqual(again);
    expect(first.status).toBe('mapped');
    expect(changed.status).toBe('mapped');
    if (first.status !== 'mapped' || changed.status !== 'mapped') {
      return;
    }
    expect(first.value.eventId).not.toBe(changed.value.eventId);
    expect(first.value.eventId).toBe(
      feedbackEventId({
        account: 'music-tools-x',
        at: '2026-09-03T12:00:00.000Z',
        action: 'prefer',
        note: 'A',
        dimension: 'topic',
        value: 'music',
        active: true,
      }),
    );
  });

  it('does not mutate input', () => {
    const row = feedbackRow();
    const before = structuredClone(row);
    adaptSnsAiHumanFeedback(row, CONTEXT);
    expect(row).toEqual(before);
  });
});
