# `@sns-growth-bridge/adapters-my-sns`

Read-only adapter from My-SNS shapes into canonical contracts.

**Phase 1:** package skeleton only.

Not in this package (and not in Phase 1 at all):

- `creatorId` mapping (`Workspace.ownerId` / `Seed.createdBy` / acting user are **not** chosen)
- My-SNS `MetricSnapshot` (no durable metrics/checkpoints)
- My-SNS ↔ SNS-AI account mapping
- OAuth, publish, or My-SNS source-repo changes
