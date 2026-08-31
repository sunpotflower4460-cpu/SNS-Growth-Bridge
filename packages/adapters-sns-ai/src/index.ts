/**
 * Read-only SNS-AI adapter identity.
 *
 * Phase 1 ships no history/metrics/feedback mapping and does not
 * read or write `config/runtime-policy.json`.
 * Manual-only invariants must remain untouched.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/adapters-sns-ai' as const;

export const PACKAGE_PHASE = 1 as const;
