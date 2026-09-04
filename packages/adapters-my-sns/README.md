# `@sns-growth-bridge/adapters-my-sns`

Read-only, pure adapters from sanitized My-SNS-shaped DTOs into Canonical contracts.

**Phase 5:** BrandProfile, HumanCorrectionEvent, and confirmed PublishedPostSnapshot.

Does **not** connect to Supabase, invent `creatorId`, map `socialAccountId` to SNS-AI `accountId`, emit MetricSnapshot, or generate CreatorAction / Anchor / Orbit.

See `docs/phase5/MY_SNS_ADAPTER_MAPPING.md`.
