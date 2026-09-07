/**
 * Workspace testing-harness identity.
 *
 * Phase 1 proved that packages resolve and build.
 * Contract fixtures live in `@sns-growth-bridge/contracts` (Phase 2).
 * Full-loop scoring/strategy scenarios belong in later phases.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/testing' as const;

export const PACKAGE_PHASE = 1 as const;

export const WORKSPACE_PACKAGE_NAMES = [
  '@sns-growth-bridge/contracts',
  '@sns-growth-bridge/scoring',
  '@sns-growth-bridge/strategy',
  '@sns-growth-bridge/adapters-my-sns',
  '@sns-growth-bridge/adapters-sns-ai',
  '@sns-growth-bridge/identity-links',
  '@sns-growth-bridge/runtime-transport',
  '@sns-growth-bridge/testing',
] as const;
