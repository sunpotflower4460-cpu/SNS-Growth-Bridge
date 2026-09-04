# Phase 5 — My-SNS adapter mapping

Pure DTO → Canonical. No Supabase. Source SHA: `cafde5995b80e9054fb4780a10e02db9c3c033ff`.

Historical Phase 0 matrix: `docs/audit/MAPPING_MATRIX.md` (not rewritten).

Mapping values: `direct` / `deterministically_derived` / `optional_unavailable` / `blocked`.

## Envelope

| Canonical field | My-SNS source | Mapping | Confidence | Unavailable / reason |
|---|---|---|---|---|
| `meta.schemaVersion` | adapter stamps `1` | deterministically_derived | high | caller does not supply it |
| `meta.producer` | `'my-sns'` | deterministically_derived | high | |
| `meta.producedAt` | `MySnsAdapterContext.producedAt` | direct | high | no implicit clock |
| `meta.traceId` | `MySnsAdapterContext.traceId` | direct | high | no random UUID |

## Identity

| Canonical field | My-SNS source | Mapping | Confidence | Unavailable / reason |
|---|---|---|---|---|
| `subject.workspaceId` | `workspaceId` on BrandProfile / DraftRevision / PublishJob | direct | high | |
| `subject.creatorId` | none | blocked | n/a | never `ownerId` / `createdBy` / `approvedBy` |
| `subject.accountId` | `socialAccountId` exists on jobs | blocked | n/a | not an SNS-AI accountId; no cross-repo map |

## BrandProfile → CreatorProfileSnapshot

| Canonical field | My-SNS source | Mapping | Confidence | Unavailable / reason |
|---|---|---|---|---|
| `profileVersion` | `my-sns:<id>:<updatedAt>` | deterministically_derived | high | empty `id` / invalid `updatedAt` blocked at adapter boundary |
| `name` | `name` | direct | high | |
| `audience` | `audience?` | direct | high | optional |
| `language` | `language` | direct | high | |
| `voiceTraits` | `voiceTraits` | direct | high | copied, not mutated |
| `values` | `values` | direct | high | |
| `preferredTerms` | `preferredTerms` | direct | high | not promoted to `must` |
| `avoidedTerms` | `avoidedTerms` | direct | high | not promoted to `never` |
| `defaultCallToAction` | `defaultCallToAction?` | direct | high | |
| `hardRules` | none | optional_unavailable | high | always `[]` in Phase 5 |
| `description` | `BrandProfile.description?` | optional_unavailable | high | **currently not represented** on Canonical CreatorProfileSnapshot |

Public API: `adaptMySnsBrandProfile()`.

## DraftRevision → HumanCorrectionEvent

Normalization (`normalizeMySnsDraftSnapshot`) matches current My-SNS `freezeAiOriginalSnapshot`:

- title/CTA: `trimToUndefined`
- body: exact
- hashtags: copied, not deduped; comparison is sort-based via Canonical `deriveChangedFields`

Then `deriveChangedFields(before, after)` is used on **normalized** snapshots, not raw untrimmed strings.

| Canonical field | My-SNS source | Mapping | Confidence | Unavailable / reason |
|---|---|---|---|---|
| `eventId` | `my-sns:human-correction:<revision.id>` | deterministically_derived | high | empty `revision.id` also fails Canonical `revisionId` |
| `platform` | `revision.channel` | direct | high | `line` skipped; unknown fail closed |
| `seedId` | `revision.seedId` | direct | high | |
| `draftId` | `revision.socialDraftId` | direct | high | |
| `revisionId` | `revision.id` | direct | high | |
| `aiGenerationId` | `revision.aiGenerationId?` | direct | high | |
| `occurredAt` | `revision.createdAt` | direct | high | |
| `before` | normalized `aiOriginalSnapshot` | deterministically_derived | high | missing snapshot → no event |
| `after` | normalized approved revision | deterministically_derived | high | |
| `changedFields` | derived after normalize | deterministically_derived | high | must match validator |

Not-applicable:

- `source === 'template'`
- missing `aiOriginalSnapshot`
- unedited approval (including title/CTA trim-only and hashtag reorder-only)

No per-channel event cap. Style tendencies are not mixed in.

Public API: `adaptMySnsDraftRevisionToHumanCorrection()`.

## Confirmed publication → PublishedPostSnapshot

Required inputs (caller-joined, no DB): `PublishJob`, `PublishAttempt[]`, `DraftRevision`.

Emit only when `job.status === 'published'` **and** a same-workspace same-job `success` attempt exists.

| Canonical field | My-SNS source | Mapping | Confidence | Unavailable / reason |
|---|---|---|---|---|
| `postId` | `my-sns:publish-job:<job.id>` | deterministically_derived | high | empty `job.id` blocked at adapter boundary; not reconciled with SNS-AI |
| `platform` | `job.channel` | direct | high | Canonical platforms only |
| `revisionId` | `job.revisionId` | direct | high | must equal `revision.id` |
| `seedId` | `job.seedId` | direct | high | must equal `revision.seedId` |
| `text` | `revision.body` | direct | high | do not concatenate title/hashtags/CTA |
| `externalPostId` | selected success attempt | direct | high | optional on manual publish |
| `externalUrl` | selected success attempt | direct | high | optional |
| `publishedAt` | `job.publishedAt` | direct | high | missing → **blocked**, no attempt fallback |
| `media` | none proven on job/attempt | optional_unavailable | high | always `[]` in Phase 5 |
| `features` | none | optional_unavailable | high | always `{}` |
| `experimentAssignment` | none | optional_unavailable | high | omitted |

Success attempt selection (deterministic):

1. `publishJobId === job.id`
2. reject the set if any remaining attempt `workspaceId` mismatches
3. `status === 'success'`
4. highest `attemptNumber`
5. tie → newest `createdAt`
6. tie → stable original order

Join integrity (else **blocked**):

```text
revision.id === job.revisionId
revision.seedId === job.seedId
revision.workspaceId === job.workspaceId
revision.socialDraftId === job.draftId
revision.channel === job.channel
```

Public API: `adaptMySnsPublishedPost()`.

## Source identity / provenance fail-closed

Prefixing a source id into a Canonical string (`my-sns:<id>:…`, `my-sns:publish-job:<id>`) would make an empty source value look like a non-empty Canonical id. Adapter boundary rejects those sources **before** prefixing:

| Source field | Adapter check | Why Canonical `nonEmptyString` is insufficient |
|---|---|---|
| `BrandProfile.id` | non-empty after trim | becomes `profileVersion` `my-sns:<id>:<updatedAt>` |
| `BrandProfile.updatedAt` | ISO 8601 datetime with offset | embedded in `profileVersion`; Canonical `profileVersion` is not a datetime |
| `PublishJob.id` | non-empty after trim | becomes `postId` `my-sns:publish-job:<id>` |

Other identity / provenance fields are passed **directly** into Canonical validators (no prefix laundering). Empty / invalid values fail closed there:

| Source field | Canonical field | Validator |
|---|---|---|
| `workspaceId` | `subject.workspaceId` | `nonEmptyString` |
| `DraftRevision.id` | `revisionId` | `nonEmptyString` (also prefixed into `eventId`; parse still fails on `revisionId`) |
| `DraftRevision.socialDraftId` | `draftId` | `nonEmptyString` |
| `DraftRevision.seedId` | `seedId` | optional `nonEmptyString` |
| `DraftRevision.createdAt` | `occurredAt` | `isoDateTime` |
| `PublishJob.revisionId` / `seedId` | `revisionId` / `seedId` | optional `nonEmptyString` |
| `PublishJob.publishedAt` | `publishedAt` | missing → adapter blocked; invalid → `isoDateTime` |
| `MySnsAdapterContext.producedAt` / `traceId` | `EnvelopeMeta` | `isoDateTime` / `nonEmptyString` |

## Not implemented

| Canonical type | Status |
|---|---|
| MetricSnapshot | **blocked** (`MY_SNS_METRIC_SNAPSHOT_STATUS`) |
| ExplicitFeedbackEvent | not implemented |
| Experiment* | not implemented |
| CreatorAction / Anchor / Orbit | not implemented |
| GrowthStrategySnapshot | not connected (Phase 4 engine stays unused here) |
