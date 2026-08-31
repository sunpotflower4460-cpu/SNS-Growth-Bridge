# My-SNS Current State — Phase 0 Audit

Status: audit only. No My-SNS code was changed.

## Audit metadata

| Item | Value |
|---|---|
| Repository | `sunpotflower4460-cpu/My-SNS` |
| Branch | `main` |
| Audited commit SHA | `bab19cb5a2dfdc63e59869b526350ab3a4878f31` |
| Commit subject | `fix: 原文の添削とサムネHookをassumptionsに載せない (#88)` |
| Commit datetime | `2026-08-31T07:08:56Z` |
| Audit datetime UTC | `2026-08-31T07:44:25Z` |
| Persistence | Supabase / Postgres. **No Prisma.** Domain types live in TypeScript. |
| ORM / packages | None. App code is Next.js under `src/`. |

This audit prefers current implementation over roadmap prose.

---

## 1. Persistence overview

Relevant migrations:

| Path | What it introduces |
|---|---|
| `supabase/migrations/20260421000000_initial_schema.sql` | `profiles`, `workspaces`, `workspace_members`, `social_accounts`, `publish_jobs`, `publish_job_status` |
| `supabase/migrations/20260715010000_seed_brand_profile_foundation.sql` | `brand_profiles`, `seeds` (renamed from `contents`), `publishing_channel` enum |
| `supabase/migrations/20260716000000_ai_draft_generation.sql` | `social_drafts`, `draft_revisions`, `ai_generations`, first `approve_social_draft` |
| `supabase/migrations/20260717000000_scheduling_engine.sql` | `publish_mode`, `publish_attempts`, attempt status/failure enums |
| `supabase/migrations/20260718000000_x_instagram_connectors.sql` | `social_account_credentials` |
| `supabase/migrations/20260719000000_publish_job_claims.sql` | `publish_jobs.claimed_at` |
| `supabase/migrations/20260721000000_analytics_learning.sql` | `ai_original_snapshot` on drafts/revisions; **no engagement-metrics table** |
| `supabase/migrations/20260727000000_creator_status.sql` | `creator_status` (mood/availability, not growth identity) |
| `supabase/migrations/20260826074000_worker_claim_tokens.sql` | `claim_token` |
| `supabase/migrations/20260826082000_publish_external_call_fence.sql` | `external_call_started_at` |
| `supabase/migrations/20260826073000_block_partial_publish_retry.sql` | blocks retry of partial/unknown results |
| `supabase/migrations/20260828153000_multi_account_thumbnails_variants.sql` | `publish_jobs.social_account_id` |

Canonical TypeScript types: `src/lib/domain/types.ts`.

---

## 2. Creator / Workspace identity

### 2.1 Proven shapes

```text
auth.users.id = profiles.id = userId
       │
       ├─ workspaces.owner_id                 Workspace.ownerId
       ├─ workspace_members.user_id           WorkspaceMember.userId
       ├─ seeds.created_by                    Seed.createdBy
       ├─ brand_profiles.created_by           BrandProfile.createdBy
       ├─ social_drafts.created_by            SocialDraft.createdBy
       ├─ draft_revisions.approved_by         DraftRevision.approvedBy
       └─ creator_status.user_id              per-user mood in a workspace

workspace_id scopes almost all content.
social_accounts.workspace_id → connected publishing/messaging account.
social_account_credentials hang off social_account_id, not workspace/user.
publish_jobs.social_account_id optionally selects which connected account to publish to.
```

`Workspace` (`src/lib/domain/types.ts`):

- `id`, `name`, `slug`, `logoUrl?`, `ownerId`, `createdAt`, `updatedAt`

`WorkspaceMember`:

- `id`, `workspaceId`, `userId`, `role: owner|admin|editor|contributor|viewer`, `joinedAt`

`SocialAccount`:

- `id`, `workspaceId`, `platform: SocialPlatform`, `handle`, `connected`, `connectedAt?`, `externalAccountId?`, `updatedAt`

`BrandProfile`:

- `id`, `workspaceId`, `name`, `description?`, `audience?`
- `voiceTraits: string[]`, `values: string[]`, `preferredTerms: string[]`, `avoidedTerms: string[]`
- `defaultCallToAction?`, `language` (DB default `'ja'`), `isDefault`, `createdBy`, `createdAt`, `updatedAt`

There is **no structured hard-rule object** (`id` / `type` / `scope` / `pinned`). Constraints are string arrays plus prompt text.

### 2.2 Platforms vs publishing channels

```ts
SocialPlatform     = 'youtube' | 'instagram' | 'threads' | 'x' | 'tiktok' | 'facebook' | 'line'
PublishingChannel  = SocialPlatform | 'note' | 'website'
CORE_PUBLISHING_CHANNELS = ['youtube', 'note', 'instagram', 'x', 'tiktok']
```

`line` is a **messaging** platform (LINE Official Account). It is not offered in the Seed channel picker and is never scheduled as a post. Bridge `Platform` in `docs/CONTRACTS.md` does not include `line`.

`publishing_channel` SQL enum (`20260715010000_seed_brand_profile_foundation.sql`) is: `youtube, note, instagram, x, tiktok, threads, facebook, website`. It does **not** include `line`.

### 2.3 There is no `creatorId`

Searched current `main`. There is **no** `creatorId` / `creator_id` column, type, or first-class growth identity.

Closest existing fields (candidates only — **not chosen** by this audit):

| Field | Meaning in current code |
|---|---|
| `Workspace.id` | Tenant / workspace identity. Used everywhere as `workspaceId`. |
| `Workspace.ownerId` | Workspace owner (`profiles.id`). |
| `Seed.createdBy` | User who captured the seed. Nested `Seed.creator?: User` is a PostgREST join alias (`creator:profiles(*)`), not a separate identity. |
| Acting `user.id` | Member performing generate / approve / publish. |
| `CreatorStatus` | Mood/availability for messaging, keyed by `(workspaceId, userId)`. Not a creator identity. |

Bridge `creatorId` **cannot** be mapped until an explicit adapter convention is chosen. Do not silently use `ownerId`.

### 2.4 Key identity files

| Concern | Path |
|---|---|
| Domain types | `src/lib/domain/types.ts` |
| Workspaces / members | `src/lib/repositories/supabase/workspaces.ts` |
| Brand profiles | `src/lib/repositories/supabase/brand-profiles.ts` |
| Social accounts | `src/lib/repositories/supabase/social-accounts.ts` |
| Seeds + brand join | `src/lib/repositories/supabase/seeds.ts` |
| Creator status | `src/lib/repositories/supabase/creator-status.ts` |
| Permissions | `src/lib/permissions/index.ts` |

---

## 3. Content lineage

Proven path:

```text
Seed
  → SocialDraft          (mutable proposal, channel-scoped)
       ai_original_snapshot frozen on first INSERT if source='ai'
  → human may edit SocialDraft fields
  → approve_social_draft(draft_id) RPC
       social_drafts.status = 'approved'
       INSERT DraftRevision (immutable) copying current fields + ai_original_snapshot
  → PublishJob.revision_id → publish worker / manual complete
```

There is **no separate Approval type**. Approval **is** inserting a `draft_revisions` row via `approve_social_draft`.

### 3.1 Seed

`src/lib/domain/types.ts` `Seed`:

- `id`, `workspaceId`, `title`, `sourceText?`, `kind: music|video|image|text|mixed`
- `status: captured|ready|archived`
- `goal?`, `audience?`, `keyPoints[]`, `callToAction?`
- `targetChannels: PublishingChannel[]`
- `brandProfileId?`, nested `brandProfile?: BrandProfile`
- `tags[]`, `createdBy`, `createdAt`, `updatedAt`

### 3.2 SocialDraft

- Mutable fields: `title?`, `draftText` (not named `body`), `hashtags[]`, `cta?`, `assumptions[]`, `metadata`
- `source: 'template' | 'ai'`
- `status: 'draft' | 'approved' | 'rejected'`
- `aiOriginalSnapshot?: AiDraftSnapshot`

`AiDraftSnapshot`: `{ title?, body, hashtags[], cta? }`

### 3.3 Where the AI original is stored

1. `social_drafts.ai_original_snapshot` (JSONB) — set **once on first INSERT** when `source === 'ai'`. Never updated later.

Source: `src/lib/repositories/supabase/drafts.ts` (`upsertSocialDraft`).

2. `draft_revisions.ai_original_snapshot` — copied at approval by `approve_social_draft` (`supabase/migrations/20260721000000_analytics_learning.sql`).

Honest limitation, documented on the column itself:

> this is the earliest point the app's architecture actually persists anything — the raw model output only ever exists transiently in the browser before a first save, so a quick edit made before that first save is already baked in.

Template-sourced drafts get `null`. Rows saved before this column existed also have `null`.

### 3.4 Where the human-approved version is stored

`draft_revisions`: `title`, `body` (copied from `social_drafts.draft_text`), `hashtags`, `cta`, `assumptions`, `metadata`, `source`, `approved_by`, `ai_original_snapshot`.

Revisions are immutable after insert.

### 3.5 Human-edit detection

`src/lib/repositories/supabase/draft-revisions.ts` `wasRevisionEditedByHuman(revision)`:

```ts
true iff aiOriginalSnapshot exists AND any of:
  revision.body !== snapshot.body
  (revision.title ?? '') !== (snapshot.title ?? '')
  (revision.cta ?? '') !== (snapshot.cta ?? '')
  sortedHashtags(revision.hashtags) !== sortedHashtags(snapshot.hashtags)
```

Hashtag comparison is **order-insensitive**.

Tests: `src/lib/repositories/supabase/draft-revisions.test.ts`.

Proven cases:

| Case | `wasRevisionEditedByHuman` |
|---|---|
| No snapshot (template / pre-column) | `false` |
| Unedited approval (all four fields equal) | `false` |
| Body edit | `true` |
| Title-only edit | `true` |
| CTA-only edit | `true` |
| Hashtag-set-only edit | `true` |

This matches the Bridge rule: simple approval is **not** a human correction.

---

## 4. How correction evidence is learned (and what is not learned)

### 4.1 Draft generation few-shot

`listRecentAiRevisionsForStyleLearning` (`src/lib/repositories/supabase/draft-revisions.ts`):

Filters:

1. `source = 'ai'`
2. requested `channel`s
3. `ai_original_snapshot IS NOT NULL`
4. newest-first, scan max 50 rows
5. skip unless `wasRevisionEditedByHuman`
6. **2 examples per channel**

Payload actually passed to the model (`DraftStyleExample`):

```ts
{ channel, aiProposed: snapshot.body, humanApproved: revision.body }
```

**Asymmetry:** learnability uses four fields; few-shot currently passes **bodies only**. A title/CTA/hashtag-only edit can enter the example set with identical `aiProposed` / `humanApproved` bodies.

### 4.2 Reply learning is a different, weaker rule

`src/lib/repositories/supabase/reply-learning.ts` prefers edited replies but **still includes verbatim AI approvals**. Draft learning does **not**. Bridge `HumanCorrectionEvent` must follow the **draft** rule, not the reply rule.

### 4.3 Fail-closed on style-example load

`src/app/api/drafts/generate/route.ts`: if `listRecentAiRevisionsForStyleLearning` throws, generation returns **503** and stops. This contradicts `docs/master-plan.md` (see stale docs).

---

## 5. Publication truth

### 5.1 Types

`PublishJobStatus`: `'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled'`

`PublishMode`: `'auto' | 'assisted' | 'draft' | 'manual' | 'owned'`

`PublishAttemptStatus`: `'success' | 'failed'` only. There is no `pending` / `unknown` attempt status. Ambiguous outcomes are encoded in `publish_jobs.error_message` prefixes while job status stays `failed`.

`PublishJob` key fields: `id`, `workspaceId`, `seedId`, `draftId`, `revisionId`, `channel`, `publishMode`, `status`, `scheduledAt?`, `publishedAt?`, `errorMessage?`, `claimedAt?`, `createdBy`, `socialAccountId?`

`PublishAttempt` key fields: `id`, `workspaceId`, `publishJobId`, `attemptNumber`, `status`, `failureReason?`, `errorMessage?`, `externalPostId?`, `externalUrl?`, `createdBy?`, `createdAt`

External post id/url live **only on attempts**, not on jobs. Attempts are append-only.

### 5.2 Worker / routes

| Role | Path |
|---|---|
| Shared processor | `src/lib/services/publish-worker.ts` `processPublishJob` |
| Cron batch (auto only) | `src/app/api/publish/run/route.ts` |
| Manual “Publish now” / retry | `src/app/api/publish/trigger/route.ts` |
| Queue CRUD / retry / cancel / manual mark | `src/lib/repositories/supabase/queue.ts` |
| Attempt ledger | `src/lib/repositories/supabase/publish-attempts.ts` |
| Mode derivation | `src/lib/channels/config.ts` |

### 5.3 Manual / assisted / auto / owned

`getPublishingStrategy()` (`src/lib/channels/config.ts`):

- Default / unknown env → **`zero-cost`**
- Only `NEXT_PUBLIC_PUBLISHING_STRATEGY === 'api-first'` enables API posting

Under **zero-cost** (current default):

- `website` → `owned`
- everything else → `manual`
- Worker and API trigger are not used for third-party posting

Under **api-first**:

| Channel | `mvpPublishMode` |
|---|---|
| youtube, instagram, x, tiktok | `auto` |
| threads, facebook | `assisted` |
| note | `manual` |
| website | `owned` |

Semantics:

- `auto`: cron worker publishes due `scheduled` jobs
- `assisted` / `draft`: queued; human uses `/api/publish/trigger`
- `manual`: worker never touches; human records completion (`complete_manual_publish`)
- `owned`: website; no SNS handoff

### 5.4 How success is determined

Authoritative local success requires:

1. Append-only `publish_attempts.status = 'success'`
2. Job `publish_jobs.status = 'published'` with `published_at` (DB guard)

Worker happy path (`publish-worker.ts`):

1. Claim job (`claim_token`)
2. If a prior success attempt exists → mark job `published`, **do not** call provider again
3. `adapter.publish(...)` returns without throw → `PublishResult { externalPostId?, externalUrl? }`
4. Record success attempt
5. Release claim with `status: 'published'`, `published_at` set

Provider success definitions proven in connectors:

| Platform | Success when | External id / URL |
|---|---|---|
| X | tweet create OK with `data.id` | `externalPostId`, URL if username known |
| Instagram | `media_publish` OK with `id` | `externalPostId`, optional permalink |
| YouTube | upload returns video id; privacy must match requested public or `PARTIAL_...` | `externalPostId=videoId`, watch URL |
| TikTok | status poll `complete` | `externalPostId = postId ?? publish_id`; **no URL** |
| Threads / Facebook | stub throws unavailable | N/A |
| note / website | human-only | optional URL on manual complete |
| LINE | not a publish channel | N/A |

Manual completion: RPC `complete_manual_publish` inserts a success attempt and sets job `published`. Manual complete often has **URL only**; `external_post_id` may be null.

TikTok pending: `TIKTOK_PENDING:` while processing → **not published**. Reconcile to success only when status is `complete`.

### 5.5 Partial success / ambiguous result

Prefixes stored in `publish_jobs.error_message` while status remains **`failed`**:

| Prefix | Meaning |
|---|---|
| `PARTIAL_EXTERNAL_SUCCESS:` | Irreversible side effect happened (e.g. X thread mid-fail, YouTube wrong privacy / thumb fail) |
| `EXTERNAL_RESULT_UNKNOWN:` | Request crossed side-effect boundary; local outcome unknown (network after send, 5xx after create, success HTTP without parseable id, or adapter returned but DB bookkeeping failed) |
| `TIKTOK_PENDING:` | Init succeeded; still processing |

These are **not published**. DB blocks `failed → scheduled` retry for these markers. Markers are preserved until a confirmed publish.

If `confirmedPublish` is set in memory but later DB reconciliation fails, worker writes `EXTERNAL_RESULT_UNKNOWN` and returns `{ success: false }`. Bridge must **not** treat this as published.

### 5.6 Retry and duplicate-send prevention

Proven protections:

1. Claim + `claim_token`; stale claim window 10 minutes
2. Skip (`skipped: true`) if claim fails — no second platform call
3. `external_call_started_at` fence: blocks reclaim unless a success attempt already exists
4. One non-cancelled job per `revision_id`
5. Reconcile existing success attempt before any new provider call
6. Manual complete RPC is row-locked and idempotent if already published
7. Partial/unknown markers block automatic retry

### 5.7 States that must NOT become `PublishedPostSnapshot`

Do not emit a canonical published post when:

- `status` is `draft`, `scheduled`, `failed`, or `cancelled`
- job is claimed / in-flight
- `external_call_started_at` is set without a success attempt
- error_message has `PARTIAL_EXTERNAL_SUCCESS:`, `EXTERNAL_RESULT_UNKNOWN:`, or `TIKTOK_PENDING:`
- success attempt is missing

Safe publication truth for Bridge:

```text
publish_jobs.status === 'published'
AND EXISTS publish_attempts WHERE status = 'success'
```

For metrics join, also require `publish_attempts.external_post_id IS NOT NULL`. Manual/zero-cost publishes often lack that key.

---

## 6. Metrics / Analytics

### 6.1 There is no metrics persistence

Proven: **no** metrics / analytics snapshot table, no checkpoint rows, no historical series.

`20260721000000_analytics_learning.sql` adds `ai_original_snapshot` only. Domain comment is explicit (`src/lib/domain/types.ts`):

> Post Metrics (not persisted — fetched live)

```ts
export interface PostMetrics {
  views?: number
  likes?: number
  comments?: number
  shares?: number
}
```

Only those four optional fields exist in the product type. **No** `impressions`, `reach`, `saves`, `clicks`, `follows`, or watch-quality fields are stored or returned as first-class names.

### 6.2 What the Analytics page actually computes

`src/lib/presentation/analytics-presenter.ts` computes **publish success/failure rates**, AI cost, and human-edit rate from local ledgers. That is operational analytics, not audience performance.

Live engagement UI: `src/app/app/analytics/page.tsx` + `POST /api/analytics/metrics` (`src/app/api/analytics/metrics/route.ts`).

### 6.3 Live fetch path

1. Load `publish_jobs` `{ id, channel }`
2. Latest **success** attempt with **non-null** `external_post_id`
3. Resolve OAuth credentials for `job.channel` (credentials must **not** enter Bridge)
4. `getConnectorAdapter(channel).fetchMetrics({ postId })`
5. Return `PostMetrics` JSON — **not written to DB**

Join key: `publish_attempts.external_post_id`.

`selectRecentPublished` requires `attempt.status === 'success' && attempt.externalPostId`.

### 6.4 Checkpoint concept

**Does not exist** for metric maturity. No 60 / 360 / 1440 minute checkpoints in My-SNS.

“24h” appears as Instagram publishing quota / cron delay prose, not as a metrics checkpoint.

### 6.5 Platform coverage (metrics)

| Platform | Publish API | Metrics fetch | Fields returned |
|---|---|---|---|
| X | Yes | Yes (`x-connector.ts`) | `views` ← `impression_count`; `likes`; `comments` ← `reply_count`; `shares` ← `retweet_count` |
| YouTube | Yes | Yes (`youtube-connector.ts`) | `views`, `likes`, `comments` (no shares) |
| Instagram | Yes | Throws: Insights scope not requested | none |
| TikTok | Yes | Throws: read gap | none |
| Threads | Stub unavailable | unavailable | none |
| Facebook | Stub unavailable | unavailable | none |
| note | Manual only | none | none |
| website | Owned / manual | none | none |
| LINE | Not publish | Explicitly no post metrics | none |

X maps provider `impression_count` into product field **`views`**. There is no separate `impressions` field. This is a semantic trap for Bridge `RawMetricVector.impressions` vs `.views`.

### 6.6 Requested metric checklist

| Field | Proven in My-SNS? |
|---|---|
| views | Yes — live only, X (as impressions renamed) and YouTube |
| impressions | **Not as own field**; X `impression_count` → `views` |
| reach | **Not proven** |
| likes | Yes — live only, X and YouTube. Canonical `RawMetricVector` currently has **no `likes` field** |
| shares | Yes — live only, X (`retweet_count`) |
| comments | Yes — live only, X and YouTube |
| saves | **Not proven** |
| clicks | **Not proven** |
| follows | **Not proven** |
| watch metrics | **Not proven** |

### 6.7 Mapping implication

`MetricSnapshot` **cannot** be produced from My-SNS as of this SHA:

- no durable rows
- no `capturedAt` / `checkpointMinutes` series
- incomplete platform coverage
- live fetch requires provider credentials (forbidden in Bridge)
- many published jobs (especially zero-cost/manual) have no `external_post_id`

Do not invent a My-SNS → `MetricSnapshot` adapter in Phase 5 until a durable, credential-free export exists.

---

## 7. AI generation context

Entry: `POST /api/drafts/generate` (`src/app/api/drafts/generate/route.ts`)

Loads, in order:

1. `Seed` via `SEED_SELECT` (includes nested `brand_profile`)
2. `styleExamples` via `listRecentAiRevisionsForStyleLearning` (fail-closed)
3. Context:

```ts
{
  createdBy: user.id,
  brandProfile: seed.brandProfile ?? null,
  styleExamples,
}
```

`DraftGenerationContext.workspaceName` is defined in `src/lib/services/interfaces.ts` but the generate route **does not set it**.

Prompt assembly: `buildDraftGenerationPrompt` in `src/lib/services/anthropic-draft.ts`.

| Input | How used |
|---|---|
| Brand Profile | Constraint block: name, description, audience, voiceTraits, values, preferredTerms, avoidedTerms, defaultCTA. System prompt: “constraints, not suggestions.” |
| Seed | title, sourceText, goal, audience, keyPoints, callToAction |
| tone / length | Requested tone/length |
| Channels | Per-channel intent from `PUBLISHING_CHANNEL_CONFIG[channel].description` |
| styleExamples | Few-shot: `AI proposed` → `Creator approved` (**body only**) |

System prompt also: never invent facts; `assumptions` only for fact gaps (not copy-edit / thumbnail hooks) — matches commit `#88`.

Channel metadata schema (tool): YouTube `{description, chapters?, thumbnailHook?}`, X `{thread?}`, IG/TikTok `{coverText?, hook?}`, note `{markdown, eyecatchIdeas?}`.

Template fallback: `TemplateDraftGeneratorService` in `src/lib/services/ai-draft.ts` — ignores brand/styleExamples; `source: 'template'` so no snapshot / no draft learning.

**GrowthStrategySnapshot is not passed today.** Future soft-guidance insertion point is this generate context / `buildDraftGenerationPrompt`, after Brand Profile and style examples, never above them.

Current implicit priority in the prompt:

```text
Safety / do-not-invent-facts
> Brand Profile hard constraints
> current Seed + explicit tone/length
> human correction few-shot (body diffs)
```

There is no audience-performance block in My-SNS generation.

---

## 8. Experiments / explicit prefer-avoid-pin-note

**Not present** as first-class My-SNS types or tables.

- No experiment definition / assignment / evaluation
- No `prefer` / `avoid` / `correct` / `pin` / `note` feedback ledger
- Brand Profile `preferredTerms` / `avoidedTerms` are identity constraints, not ExplicitFeedbackEvent
- `wasRevisionEditedByHuman` diffs are correction evidence, not explicit feedback actions

Do not invent My-SNS experiment or pin-feedback mappings.

---

## 9. Feature dimensions

SNS-AI dimensions (`topic`, `angle`, `hook`, `emotion`, `format`, `cta`, `mediaDecision`, `postingHour`) are **not stored** on My-SNS drafts/revisions/jobs.

Draft `cta` is copy, not a growth-feature enum. Draft `metadata` is channel extras, not feature tags. `Asset.mediaRole` (`source|variant|thumbnail|cover|eyecatch`) is media-pipeline, not `mediaDecision`.

`PublishedPostSnapshot.features` from My-SNS is **optional_unavailable** unless a later explicit derivation is designed and approved.

---

## 10. Stale docs vs current code

| Doc claim | Current code at this SHA |
|---|---|
| `docs/master-plan.md` PR7: style-example fetch failure is **best-effort**, does not block generation | `generate/route.ts` returns **503** and stops |
| `docs/master-plan.md` PR2: Brand Profile + Seed given “as few-shot” | Brand/Seed are prompt constraints/context; **few-shot** is only edited-revision `styleExamples` |
| `docs/master-plan.md` YouTube metadata `thumbnailTextIdeas[]` | Code/tool schema: `thumbnailHook` (3–8 JP chars) |
| Older `contents` table name in early migrations | Table is `seeds` |
| CLAUDE.md points Anthropic draft implementation at `ai-draft.ts` | Real Anthropic path is `anthropic-draft.ts`; `ai-draft.ts` is template fallback |

README / CLAUDE PR7 narrative (snapshot + few-shot + unedited approval is not draft learning) **matches** code.

---

## 11. Open questions / blockers (My-SNS)

1. **No `creatorId`.** Workspace / owner / acting user / seed author are distinct. Mapping is blocked until an explicit convention is chosen.
2. **No durable metrics / checkpoints.** `MetricSnapshot` from My-SNS is blocked.
3. **X `impression_count` is stored/returned as `views`.** Canonical `impressions` vs `views` cannot be silently equated.
4. **`likes` exists live but is absent from canonical `RawMetricVector`.** Do not invent a Bridge field in Phase 0.
5. **AI original ≠ raw model output.** Pre-first-save edits pollute the learning baseline.
6. **Few-shot uses bodies only** while learnability uses four fields.
7. **Reply learning includes unedited approvals**; draft learning does not. Bridge must not mix them.
8. **Default publish strategy is zero-cost/manual.** Many “published” jobs will lack `external_post_id`.
9. **`socialAccountId` is optional** on jobs; note/website/legacy rows may have none.
10. **No My-SNS experiment or explicit-feedback ledger.**
11. **No growth feature tags** on drafts/posts.
12. **No cross-repo identity** linking a My-SNS workspace/account to an SNS-AI `accountId`.

---

## 12. Source file index

| Topic | Path |
|---|---|
| Domain types | `src/lib/domain/types.ts` |
| Draft persistence | `src/lib/repositories/supabase/drafts.ts` |
| Revision / learning | `src/lib/repositories/supabase/draft-revisions.ts` |
| Revision tests | `src/lib/repositories/supabase/draft-revisions.test.ts` |
| Generate API | `src/app/api/drafts/generate/route.ts` |
| Anthropic prompts | `src/lib/services/anthropic-draft.ts` |
| Generation interfaces | `src/lib/services/interfaces.ts` |
| Channel / publish mode | `src/lib/channels/config.ts` |
| Publish worker | `src/lib/services/publish-worker.ts` |
| Publish attempts | `src/lib/repositories/supabase/publish-attempts.ts` |
| Queue | `src/lib/repositories/supabase/queue.ts` |
| Metrics API | `src/app/api/analytics/metrics/route.ts` |
| Analytics presenter | `src/lib/presentation/analytics-presenter.ts` |
| X metrics | `src/lib/services/connectors/x-connector.ts` |
| YouTube metrics | `src/lib/services/connectors/youtube-connector.ts` |
| Instagram metrics gap | `src/lib/services/connectors/instagram-connector.ts` |
| TikTok metrics gap | `src/lib/services/connectors/tiktok-connector.ts` |
| Reply learning (do not mix) | `src/lib/repositories/supabase/reply-learning.ts` |
| Snapshot SQL | `supabase/migrations/20260721000000_analytics_learning.sql` |
| Brand Profile SQL | `supabase/migrations/20260715010000_seed_brand_profile_foundation.sql` |
| Attempts SQL | `supabase/migrations/20260717000000_scheduling_engine.sql` |
