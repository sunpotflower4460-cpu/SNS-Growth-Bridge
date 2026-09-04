/**
 * Frozen copy of SNS-AI `src/learning/features.mjs` at
 * 914c70ee4666015f93603eef9a2f3dd9a1a7de08
 * (blob aeaaf99fb81511f9cb6ae02578700c103d19589d).
 *
 * Frozen parity reference. Do not improve.
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
