# Phase 5 — My-SNS adapter source audit

Status: **adapter source of truth = current My-SNS `main`**

Phase 0 historical audit remains in `docs/audit/MY_SNS_CURRENT_STATE.md` and `docs/audit/MAPPING_MATRIX.md`. This file records drift and the facts Phase 5 adapters use.

## Audited SHA

| Item | Value |
|---|---|
| Repository | `sunpotflower4460-cpu/My-SNS` |
| Branch | `main` |
| Audited commit SHA | `cafde5995b80e9054fb4780a10e02db9c3c033ff` |
| Commit subject | `feat: AI提案への修正を記憶し、次回の提案精度を上げる (#91)` |
| Phase 0 reference SHA | `bab19cb5a2dfdc63e59869b526350ab3a4878f31` |
| Bridge base after PR #13 | `174350698d04d91fe59eb326e173236a2907ecff` |

## Inspected files

- `src/lib/domain/types.ts`
- `src/lib/services/draft-style-learning.ts`
- `src/lib/services/draft-style-learning.test.ts`
- `src/lib/repositories/supabase/drafts.ts`
- `src/lib/repositories/supabase/draft-revisions.ts`
- `src/lib/repositories/supabase/queue.ts`
- `src/lib/repositories/supabase/publish-attempts.ts`
- `src/lib/repositories/supabase/brand-profiles.ts`
- `src/lib/seeds/asset-publishing.ts`
- `src/lib/services/publish-worker.ts` (media resolve at publish time)

No BrandProfile / PublishJob / PublishAttempt / PostMetrics shape change vs Phase 0. Relevant migrations since Phase 0 do not add a metrics/checkpoint table.

## Relevant source drift since Phase 0

1. **Human correction comparison moved** from `draft-revisions.ts` into `draft-style-learning.ts`.
2. **Title / CTA comparison now trims.** Phase 0 used `(title ?? '') !== (snapshot.title ?? '')` (no trim). Current `diffSnapshots` / `freezeAiOriginalSnapshot` use `trimToUndefined()`. `" Hello "` vs `"Hello"` is **not** a correction. `"   "` vs `undefined` is **not** a correction.
3. **Body remains exact string compare.** `"hello "` vs `"hello"` **is** a correction.
4. **Hashtags remain sort-compared, not deduped.** Order-only change is not a correction.
5. **First-save AI snapshot** now prefers a generation-time copy (`snapshotForFirstAiSave`). That is My-SNS persistence responsibility. The adapter must **not** invent a snapshot when `aiOriginalSnapshot` is missing.
6. **Style tendencies** (`tends to shorten the body`, per-channel example cap of 3) are generation-prompt helpers, not Canonical event gates.
7. `AiDraftSnapshot` comment updated; fields unchanged.

Phase 5 uses **current** semantics, not Phase 0's untrimmed title/CTA compare.

## BrandProfile source

Unchanged vs Phase 0. `src/lib/domain/types.ts` `BrandProfile`:

- `id`, `workspaceId`, `name`, `description?`, `audience?`
- `voiceTraits`, `values`, `preferredTerms`, `avoidedTerms`
- `defaultCallToAction?`, `language`, `isDefault`, `createdBy`, `createdAt`, `updatedAt`

No first-class Canonical `hardRules` object.

`description` exists on My-SNS and has **no** Canonical `CreatorProfileSnapshot` field.

## HumanCorrection source

Current source of truth: `src/lib/services/draft-style-learning.ts`

Emit only when:

```text
revision.source === 'ai'
AND aiOriginalSnapshot exists
AND wasRevisionEditedByHuman (after freeze/trim semantics)
```

Do not emit for template, missing snapshot, unedited approval, hashtag reorder, title/CTA trim-only.

`STYLE_LEARNING_LIMIT_PER_CHANNEL = 3` is prompt optimization, not an adapter cap.

`summarizeStyleTendencies` is **not** part of `HumanCorrectionEvent`.

## Publication success source

Unchanged vs Phase 0:

```text
PublishJob.status === 'published'
AND at least one PublishAttempt.status === 'success'
```

Do not treat `scheduled` / `draft` / `failed` / `cancelled`, `PARTIAL_EXTERNAL_SUCCESS`, `EXTERNAL_RESULT_UNKNOWN`, or `TIKTOK_PENDING` as published.

Manual / zero-cost success may omit `externalPostId`.

`PublishJob.publishedAt` is required for Canonical `publishedAt`. Do not fall back to attempt `createdAt`.

`PublishJob.draftId` corresponds to `DraftRevision.socialDraftId`.

## Published media provenance

Publish worker signs Seed assets at publish time (`selectPublishMedia` + signed URL). That choice is **not** stored on `PublishJob` or `PublishAttempt`. Seed Asset ≠ proven published media. Phase 5 sets `media: []`.

## Metrics availability

`PostMetrics` is still live-fetch only (`views?`, `likes?`, `comments?`, `shares?`). No `snapshotId`, `capturedAt` series, or `checkpointMinutes`. **MetricSnapshot remains blocked.**

## Unresolved identity mappings

- No `creatorId`. Do not use `Workspace.ownerId`, `Seed.createdBy`, `approvedBy`, `uploadedBy`, or `createdBy`.
- `subject.workspaceId` only.
- `SocialAccount.id` / `externalAccountId` / `publishJob.socialAccountId` must not become Canonical or SNS-AI `accountId`.
- Cross-repo post identity is unresolved. Canonical `postId` is producer-local: `my-sns:publish-job:<job.id>`.

## Unavailable fields (do not invent)

- Canonical `hardRules` from BrandProfile terms
- Canonical `description`
- `features` (topic/hook/emotion/mediaDecision/postingHour)
- `experimentAssignment`
- published `media[]`
- `MetricSnapshot`
- `ExplicitFeedbackEvent`
- SNS-AI account mapping

## Blockers

1. My-SNS has no durable metrics/checkpoints.
2. No My-SNS ↔ SNS-AI account mapping.
3. No cross-repo post identity.
4. No proven publish-time media record on job/attempt.
5. No Canonical feature dimensions on My-SNS drafts.
6. No runtime transport (this phase is fixture → pure adapter only).

## Contract change required?

**No.** Title/CTA trim is handled by adapter normalization before `deriveChangedFields()`. Do not change schema major 1.
