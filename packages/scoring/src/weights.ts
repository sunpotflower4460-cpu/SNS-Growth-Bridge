import type { NormalizedMetricVector } from '@sns-growth-bridge/contracts';

export type ScoreWeightKey = keyof NormalizedMetricVector;

export type ScoreWeights = Partial<Record<ScoreWeightKey, number>>;

export type ScoreWeightsOverride = ScoreWeights;

/** SNS-AI `DEFAULT_WEIGHTS`. Instagram is intentionally asymmetric vs X. */
export const DEFAULT_PLATFORM_WEIGHTS = {
  x: {
    exposure: 0.2,
    shareRate: 0.25,
    saveRate: 0.15,
    conversationRate: 0.1,
    profileRate: 0.15,
    clickRate: 0.15,
  },
  instagram: {
    exposure: 0.2,
    shareRate: 0.25,
    saveRate: 0.2,
    conversationRate: 0.1,
    followRate: 0.1,
    watchQuality: 0.15,
  },
} as const satisfies Record<'x' | 'instagram', ScoreWeights>;

/**
 * Unknown platforms inherit X weights. Canonical Platform parsing rejects
 * strings outside the enum, so this fallback is for scoring internals and
 * platforms such as `youtube` that parse but have no dedicated weights.
 */
export function defaultWeightsForPlatform(platform: string): ScoreWeights {
  if (platform === 'instagram') {
    return { ...DEFAULT_PLATFORM_WEIGHTS.instagram };
  }
  return { ...DEFAULT_PLATFORM_WEIGHTS.x };
}

/** SNS-AI `{ ...defaults, ...(configuredWeights || {}) }`. */
export function resolveWeights(platform: string, override: ScoreWeightsOverride = {}): ScoreWeights {
  return { ...defaultWeightsForPlatform(platform), ...override };
}
