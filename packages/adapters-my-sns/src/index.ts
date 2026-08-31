/**
 * Read-only My-SNS adapter identity.
 *
 * Phase 1 ships no BrandProfile / DraftRevision / PublishAttempt mapping.
 * creatorId is undecided. My-SNS MetricSnapshot remains blocked.
 * This package must never publish, store OAuth tokens, or mutate My-SNS.
 */
export const PACKAGE_NAME = '@sns-growth-bridge/adapters-my-sns' as const;

export const PACKAGE_PHASE = 1 as const;
