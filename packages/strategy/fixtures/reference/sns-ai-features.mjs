/**
 * Frozen copy of SNS-AI `src/learning/features.mjs` at
 * 914c70ee4666015f93603eef9a2f3dd9a1a7de08
 * (blob aeaaf99fb81511f9cb6ae02578700c103d19589d).
 *
 * Byte-identical to the Phase 0 / Phase 3 reference SHA
 * 3bd90cc8ac80da84df949799dd4b8be2dc109767 — see
 * docs/phase4/STRATEGY_SOURCE_AUDIT.md.
 *
 * Do not "improve" this file. Golden expected outputs are generated from it.
 * Bridge TypeScript must match it, including the mediaDecision fallback and
 * the unconditional postingHour recompute.
 */
export const FEATURE_DIMENSIONS = ['topic', 'angle', 'hook', 'emotion', 'format', 'cta', 'mediaDecision', 'postingHour'];
export function historyFeatures(entry, timeZone = 'Asia/Tokyo') {
  const features = { ...(entry.features || {}) };
  if (!features.mediaDecision) features.mediaDecision = entry.mediaUrl ? 'library' : 'none';
  if (entry.at) {
    const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(entry.at));
    features.postingHour = `${hour}:00`;
  }
  return features;
}
