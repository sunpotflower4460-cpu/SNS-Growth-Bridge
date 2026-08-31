# `@sns-growth-bridge/adapters-sns-ai`

Read-only adapter between SNS-AI JSONL/runtime shapes and canonical contracts.

**Phase 1:** package skeleton only.

This package must never:

- enable SNS-AI accounts
- restore cron / scheduled provider polling
- publish, reply, DM, or engage
- copy provider credentials
- invent a My-SNS `SocialAccount.id` ↔ SNS-AI `accountId` mapping
