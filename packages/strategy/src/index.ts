/**
 * Pure strategy-learning package identity.
 *
 * Phase 1 ships no preferred/avoid/exploreRate builder.
 * Provenance fields (strategyId, inputsDigest, evidencePostIds) are
 * Bridge-generated additions, not current SNS-AI strategy JSON fields.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/strategy' as const;

export const PACKAGE_PHASE = 1 as const;
