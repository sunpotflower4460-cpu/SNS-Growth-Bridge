# Phase 7A — Identity link design

## Why explicit mapping

My-SNS identity is `workspaceId + socialAccountId + platform`. SNS-AI identity is `accountId + platform`. Handles, display names, `externalAccountId`, `credentialKey`, and post ids are **not** a join key. Only an operator-edited config is the source of truth.

## One-to-one v1

An **active or disabled** link is unique on:

- `workspaceId + socialAccountId`
- SNS-AI `accountId`

The same My-SNS social account cannot point at two SNS-AI accounts. The same SNS-AI account cannot point at two My-SNS social accounts. Identical duplicate config rows are rejected (no silent dedupe). Disabled rows still occupy the identity key so replacement is explicit (remove the old row).

Workspace-only linking is forbidden: one workspace can hold two X accounts.

## Identity ownership

| Side | Owner | Link fields |
|---|---|---|
| My-SNS | My-SNS | `workspaceId`, `socialAccountId` |
| SNS-AI | SNS-AI | `accountId` |
| Platform | must match both descriptors and the config | `platform` |

`creatorId` stays unresolved. `Workspace.ownerId`, `SocialAccount.externalAccountId`, and SNS-AI `accountId` are never promoted to `creatorId`.

Linked subject is `{ workspaceId, accountId }`.

## Platform consistency

Configured platform, My-SNS descriptor platform, and SNS-AI descriptor platform must be identical Canonical platforms. Mismatch fails closed. No auto-correction.

## Handle / external ID

`handle` and `externalAccountId` may exist on My-SNS descriptors as diagnostics. They are not mapping keys in v1 (handles change; the same external account can appear in more than one workspace over time).

## Disabled semantics

Operator `enabled: false` becomes Canonical `status: disabled`. Disabled links parse and store. `resolveActiveAccountLink` and `buildLinkedShadowStrategy` reject them (`link-disabled`).

SNS-AI `enabled: false` and My-SNS `connected: false` do **not** invalidate the identity mapping. SNS-AI is currently manual-only with accounts disabled.

## Duplicate handling

- Identical config twice → `duplicate-link-entry`
- Two active configs sharing My-SNS social account → `duplicate-my-sns-mapping`
- Two active configs sharing SNS-AI account → `duplicate-sns-ai-mapping`
