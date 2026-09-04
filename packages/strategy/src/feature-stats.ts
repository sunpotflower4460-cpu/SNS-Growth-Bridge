import { snsString } from '@sns-growth-bridge/scoring';

import { FEATURE_CONFIDENCE_DENOMINATOR } from './config.js';
import { FEATURE_DIMENSIONS, type FeatureStats, type PatternEvidence, type StrategySample } from './types.js';

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface FeatureGroup {
  scores: number[];
  evidencePostIds: string[];
}

export function buildFeatureStats(
  samples: readonly StrategySample[],
  overall: number,
): { featureStats: FeatureStats; patternEvidence: PatternEvidence } {
  const featureStats = {} as FeatureStats;
  const patternEvidence = {} as PatternEvidence;
  for (const dimension of FEATURE_DIMENSIONS) {
    const groups = new Map<string, FeatureGroup>();
    for (const sample of samples) {
      const value = snsString(sample.features[dimension] || '').trim();
      if (!value) {
        continue;
      }
      let group = groups.get(value);
      if (!group) {
        group = { scores: [], evidencePostIds: [] };
        groups.set(value, group);
      }
      group.scores.push(sample.score);
      group.evidencePostIds.push(sample.externalPostId);
    }
    featureStats[dimension] = Object.fromEntries(
      [...groups.entries()].map(([value, group]) => [
        value,
        {
          n: group.scores.length,
          averageScore: Math.round(mean(group.scores) * 10) / 10,
          lift: Math.round((mean(group.scores) - overall) * 10) / 10,
          confidence: Math.round(clamp(group.scores.length / FEATURE_CONFIDENCE_DENOMINATOR, 0, 1) * 100) / 100,
        },
      ]),
    );
    patternEvidence[dimension] = Object.fromEntries(
      [...groups.entries()].map(([value, group]) => [value, [...group.evidencePostIds]]),
    );
  }
  return { featureStats, patternEvidence };
}

export function meanScores(values: readonly number[]): number {
  return mean(values);
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
