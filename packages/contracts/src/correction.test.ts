import { describe, expect, it } from 'vitest';

import { deriveChangedFields, isHumanCorrectionContent } from './correction.js';
import type { DraftContentSnapshot } from './correction.js';

const base: DraftContentSnapshot = {
  title: 'Title',
  body: 'Body',
  hashtags: ['b', 'a'],
  cta: 'Go',
};

describe('deriveChangedFields', () => {
  it('treats hashtag order as unchanged', () => {
    expect(
      deriveChangedFields(base, {
        ...base,
        hashtags: ['a', 'b'],
      }),
    ).toEqual([]);
    expect(
      isHumanCorrectionContent(base, {
        ...base,
        hashtags: ['a', 'b'],
      }),
    ).toBe(false);
  });

  it('detects a hashtag-set difference', () => {
    expect(
      deriveChangedFields(base, {
        ...base,
        hashtags: ['a', 'c'],
      }),
    ).toEqual(['hashtags']);
  });

  it('does not treat an identical AI draft as a correction', () => {
    expect(isHumanCorrectionContent(base, { ...base, hashtags: [...base.hashtags] })).toBe(false);
  });

  it('detects title, body, and CTA edits', () => {
    expect(
      deriveChangedFields(base, {
        title: 'New title',
        body: 'New body',
        hashtags: ['b', 'a'],
        cta: 'Stay',
      }),
    ).toEqual(['title', 'body', 'cta']);
  });
});
