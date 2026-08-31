import type { MetricSnapshot, NormalizedMetricVector, PerformanceScore } from '@sns-growth-bridge/contracts';

import { baselineVector, requireAccountId } from './baseline.js';
import { clamp, snsNumber } from './math.js';
import { metricVectorFromRaw } from './metric-vector.js';
import { relativeScore } from './relative-score.js';
import { resolveWeights, type ScoreWeightsOverride } from './weights.js';

export interface ScoreSnapshotResult {
  score: number;
  confidence: number;
  vector: NormalizedMetricVector;
  baseline: NormalizedMetricVector;
  baselineCount: number;
  components: Record<string, number>;
}

export function scoreSnapshot(
  snapshot: MetricSnapshot,
  peers: readonly MetricSnapshot[] = [],
  configuredWeights: ScoreWeightsOverride = {},
): ScoreSnapshotResult {
  requireAccountId(snapshot);
  const vector = metricVectorFromRaw(snapshot.metrics);
  const baseline = baselineVector(snapshot, peers);
  const weights = resolveWeights(snapshot.platform, configuredWeights);
  let weighted = 0;
  let weightSum = 0;
  const components: Record<string, number> = {};
  for (const [key, weight] of Object.entries(weights)) {
    if (!(key in vector) || !Number.isFinite(snsNumber(weight)) || snsNumber(weight) <= 0) {
      continue;
    }
    const vectorKey = key as keyof NormalizedMetricVector;
    const component = relativeScore(vector[vectorKey], baseline.vector[vectorKey] || 0);
    components[key] = component;
    weighted += component * snsNumber(weight);
    weightSum += snsNumber(weight);
  }
  const score = weightSum ? weighted / weightSum : 50;
  const baselineConfidence = clamp(baseline.count / 10, 0, 1);
  const exposureConfidence = clamp(Math.log10(vector.exposure + 1) / 4, 0, 1);
  return {
    score: Math.round(score * 10) / 10,
    confidence: Math.round((baselineConfidence * 0.7 + exposureConfidence * 0.3) * 100) / 100,
    vector,
    baseline: baseline.vector,
    baselineCount: baseline.count,
    components,
  };
}

export function toPerformanceScore(postId: string, result: ScoreSnapshotResult): PerformanceScore {
  return {
    postId,
    score: result.score,
    confidence: result.confidence,
    baselineCount: result.baselineCount,
    vector: result.vector,
    baseline: result.baseline,
    components: result.components,
  };
}
