/**
 * Pure scoring package identity.
 *
 * Phase 1 ships no metricVector / baseline / platform-weight logic.
 * SNS-AI `src/analytics/scorer.mjs` remains the parity source for Phase 3.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/scoring' as const;

export const PACKAGE_PHASE = 1 as const;
