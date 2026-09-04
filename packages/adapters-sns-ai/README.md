# `@sns-growth-bridge/adapters-sns-ai`

Read-only, pure adapters from sanitized SNS-AI-shaped DTOs into Canonical contracts.

**Phase 6:** history → PublishedPostSnapshot, metrics → MetricSnapshot, human feedback → ExplicitFeedbackEvent, and history → Phase 4 `StrategyPostEvidence`.

Does **not** read JSONL from disk, call providers, invent `creatorId` / `workspaceId`, map My-SNS accounts, copy Artist Support `bridge-contracts.mjs`, or change SNS-AI `manualOnly`.

See `docs/phase6/SNS_AI_ADAPTER_MAPPING.md`.
