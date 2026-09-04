/**
 * Frozen copy of SNS-AI `config/runtime-policy.json` at audited SHA 914c70ee.
 * Phase 6 does not read or mutate the SNS-AI repository.
 */
export const SNS_AI_RUNTIME_POLICY_INVARIANTS = {
  schemaVersion: 1,
  manualOnly: true,
  requireExplicitManualInvocation: true,
  allowAutomaticAccountActivation: false,
  allowAutomaticEngagement: false,
  allowScheduledProviderPolling: false,
} as const;
