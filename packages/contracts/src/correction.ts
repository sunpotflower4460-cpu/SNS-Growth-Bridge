import { z } from 'zod';

import { envelopeMetaSchema } from './envelope.js';
import { growthSubjectRefSchema } from './identity.js';
import { platformSchema } from './platform.js';
import { isoDateTime, nonEmptyString } from './primitives.js';

export const draftFieldSchema = z.enum(['title', 'body', 'hashtags', 'cta']);

export type DraftField = z.infer<typeof draftFieldSchema>;

export const draftContentSnapshotSchema = z.object({
  title: z.string().optional(),
  body: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string().optional(),
});

export type DraftContentSnapshot = z.infer<typeof draftContentSnapshotSchema>;

function sortedHashtags(hashtags: readonly string[]): string {
  return [...hashtags].sort().join(',');
}

/** Order-insensitive hashtag comparison, matching My-SNS `wasRevisionEditedByHuman`. */
export function deriveChangedFields(
  before: DraftContentSnapshot,
  after: DraftContentSnapshot,
): DraftField[] {
  const changed: DraftField[] = [];
  if ((before.title ?? '') !== (after.title ?? '')) changed.push('title');
  if (before.body !== after.body) changed.push('body');
  if (sortedHashtags(before.hashtags) !== sortedHashtags(after.hashtags)) changed.push('hashtags');
  if ((before.cta ?? '') !== (after.cta ?? '')) changed.push('cta');
  return changed;
}

export function isHumanCorrectionContent(before: DraftContentSnapshot, after: DraftContentSnapshot): boolean {
  return deriveChangedFields(before, after).length > 0;
}

export const humanCorrectionEventSchema = z
  .object({
    meta: envelopeMetaSchema,
    eventId: nonEmptyString,
    subject: growthSubjectRefSchema,
    platform: platformSchema,
    seedId: nonEmptyString.optional(),
    draftId: nonEmptyString,
    revisionId: nonEmptyString,
    aiGenerationId: nonEmptyString.optional(),
    occurredAt: isoDateTime,
    before: draftContentSnapshotSchema,
    after: draftContentSnapshotSchema,
    changedFields: z.array(draftFieldSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const derived = deriveChangedFields(value.before, value.after);
    if (derived.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message:
          'HumanCorrectionEvent requires a real title/body/CTA/hashtag-set difference; unedited approval, template drafts, missing snapshots, and hashtag-order-only changes are not corrections',
        path: ['changedFields'],
      });
      return;
    }
    const expected = [...derived].sort().join(',');
    const actual = [...value.changedFields].sort().join(',');
    if (expected !== actual) {
      ctx.addIssue({
        code: 'custom',
        message: 'changedFields must match the before/after difference (hashtags are order-insensitive)',
        path: ['changedFields'],
      });
    }
  });

export type HumanCorrectionEvent = z.infer<typeof humanCorrectionEventSchema>;
