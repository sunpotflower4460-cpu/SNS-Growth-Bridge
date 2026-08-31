/**
 * Workspace testing-harness identity.
 *
 * Phase 1 only proves that packages resolve and build.
 * Contract fixtures and full-loop scenarios belong in later phases.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/testing' as const;

export const PACKAGE_PHASE = 1 as const;

export const WORKSPACE_PACKAGE_NAMES = [
  '@sns-growth-bridge/contracts',
  '@sns-growth-bridge/scoring',
  '@sns-growth-bridge/strategy',
  '@sns-growth-bridge/adapters-my-sns',
  '@sns-growth-bridge/adapters-sns-ai',
  '@sns-growth-bridge/testing',
] as const;
