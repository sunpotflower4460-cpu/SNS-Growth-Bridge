# Mapping Matrix — Phase 0

Maps `docs/CONTRACTS.md` fields to current `main` implementations.

| Item | Value |
|---|---|
| My-SNS SHA | `bab19cb5a2dfdc63e59869b526350ab3a4878f31` |
| SNS-AI SHA | `3bd90cc8ac80da84df949799dd4b8be2dc109767` |
| Audit datetime UTC | `2026-08-31T07:44:25Z` |

Mapping values (only these four):

| Value | Meaning |
|---|---|
| `direct` | Source field exists and is the same concept |
| `deterministically_derived` | Can be computed from proven source fields without guessing |
| `optional_unavailable` | Source does not have it; contract field may stay optional |
| `blocked` | Cannot implement this mapping until a listed gap is resolved |

Confidence: `high` / `medium` / `low` / `n/a`.

**Rule used here:** if a mapping is not proven in current code, it is `blocked` or `optional_unavailable`. Nothing in this table is inferred from roadmap text.

Companion audits:

- `docs/audit/MY_SNS_CURRENT_STATE.md`
- `docs/audit/SNS_AI_CURRENT_STATE.md`

---

## How to read identity columns

There is **no existing join** between My-SNS `workspaceId` / `SocialAccount.id` and SNS-AI `accountId`. Rows below map **within one source repo**. A unified growth identity across products is a separate blocker.

---

## 1. Envelope / identity / platform

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `EnvelopeMeta.schemaVersion` | Bridge | adapter-produced; not in source DBs | deterministically_derived | high | none — adapter stamps the contract version |
| `EnvelopeMeta.producer` | Bridge | `'my-sns' \| 'sns-ai' \| 'sns-growth-bridge'` | deterministically_derived | high | none — adapter stamps producer |
| `EnvelopeMeta.producedAt` | Bridge | adapter clock | deterministically_derived | high | none |
| `EnvelopeMeta.traceId` | Bridge | adapter-generated | deterministically_derived | high | none |
| `creatorId` | My-SNS | **no `creatorId` field**. Candidates exist but are not equivalent: `Workspace.ownerId`, `Seed.createdBy`, acting `user.id` (`src/lib/domain/types.ts`) | blocked | n/a | My-SNS has no first-class creator identity. Do not silently pick owner vs acting user vs seed author |
| `creatorId` | SNS-AI | **no `creator` id**. Only `config/accounts.json` keys and `profile.identity` prose | blocked | n/a | SNS-AI identity is account-scoped, not creator-scoped |
| `workspaceId` | My-SNS | `Workspace.id` / `workspaces.id` | direct | high | none for My-SNS-only payloads |
| `workspaceId` | SNS-AI | none | optional_unavailable | n/a | SNS-AI has no workspace concept |
| `accountId` | My-SNS | `SocialAccount.id` / `social_accounts.id`; also `publish_jobs.social_account_id` (nullable) | direct | medium | nullable on note/website/legacy jobs; not a cross-repo id |
| `accountId` | SNS-AI | `config/accounts.json` account key; history/metrics field `account` | direct | high | none within SNS-AI; no join to My-SNS |
| Cross-product identity (My-SNS workspace/account ↔ SNS-AI account) | both | **no mapping table** | blocked | n/a | cannot unify `GrowthStrategySnapshot` consumers across products until an explicit mapping is defined |
| `Platform` `'x'` | both | My-SNS `PublishingChannel` / SNS-AI `account.platform` | direct | high | none |
| `Platform` `'instagram'` | both | same | direct | high | none |
| `Platform` `'youtube'` | My-SNS | `PublishingChannel` `'youtube'` | direct | high | SNS-AI has no YouTube scorer/collector |
| `Platform` `'tiktok'` | My-SNS | `PublishingChannel` `'tiktok'` | direct | high | SNS-AI has no TikTok scorer/collector |
| `Platform` `'threads'` | My-SNS | `PublishingChannel` `'threads'` | direct | high | publish connector is stub-unavailable; no metrics |
| `Platform` `'facebook'` | My-SNS | `PublishingChannel` `'facebook'` | direct | high | publish connector is stub-unavailable; no metrics |
| `Platform` `'note'` | My-SNS | `PublishingChannel` `'note'` | direct | high | manual-only; typically no `external_post_id` |
| `Platform` `'website'` | My-SNS | `PublishingChannel` `'website'` | direct | high | owned/manual; no SNS metrics |
| My-SNS `'line'` | My-SNS | `SocialPlatform` `'line'` (messaging only, not `CORE_PUBLISHING_CHANNELS`) | optional_unavailable | high | not in Bridge `Platform` enum; not a publishing channel |

---

## 2. CreatorProfileSnapshot

Source of truth: My-SNS `BrandProfile` (`src/lib/domain/types.ts`, table `brand_profiles`). SNS-AI `account.profile` / `instructions` is a parallel operator identity, not the same table.

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `CreatorProfileSnapshot.workspaceId` | My-SNS | `BrandProfile.workspaceId` | direct | high | none |
| `CreatorProfileSnapshot.profileVersion` | My-SNS | no named version; `BrandProfile.id` + `updatedAt` exist | deterministically_derived | medium | none if adapter concatenates `id@updatedAt`; do not invent a sequence number |
| `CreatorProfileSnapshot.name` | My-SNS | `BrandProfile.name` | direct | high | none |
| `CreatorProfileSnapshot.audience` | My-SNS | `BrandProfile.audience?` | direct | high | optional in source |
| `CreatorProfileSnapshot.language` | My-SNS | `BrandProfile.language` (DB default `'ja'`) | direct | high | none |
| `CreatorProfileSnapshot.voiceTraits` | My-SNS | `BrandProfile.voiceTraits` | direct | high | none |
| `CreatorProfileSnapshot.values` | My-SNS | `BrandProfile.values` | direct | high | none |
| `CreatorProfileSnapshot.preferredTerms` | My-SNS | `BrandProfile.preferredTerms` | direct | high | none |
| `CreatorProfileSnapshot.avoidedTerms` | My-SNS | `BrandProfile.avoidedTerms` | direct | high | none |
| `CreatorProfileSnapshot.defaultCallToAction` | My-SNS | `BrandProfile.defaultCallToAction?` | direct | high | optional in source |
| `CreatorHardRule.id` | My-SNS | none | optional_unavailable | n/a | Brand Profile has no rule ids |
| `CreatorHardRule.type` `'prefer'\|'avoid'` | My-SNS | `preferredTerms` / `avoidedTerms` string arrays | deterministically_derived | medium | only prefer/avoid are implied; `'must'` / `'never'` do not exist |
| `CreatorHardRule.type` `'must'\|'never'` | My-SNS | none | optional_unavailable | n/a | no source |
| `CreatorHardRule.scope` | My-SNS | none (Brand Profile is workspace-global) | optional_unavailable | n/a | inventing `scope: 'all'` would be a convention, not a proven field |
| `CreatorHardRule.text` | My-SNS | term string from preferred/avoided arrays | direct | high | none for those arrays |
| `CreatorHardRule.source` `'brand-profile'` | My-SNS | implied for Brand Profile rows | deterministically_derived | high | none if adapter labels Brand Profile terms as `brand-profile` |
| `CreatorHardRule.source` `'explicit-feedback'` | My-SNS | none | optional_unavailable | n/a | My-SNS has no prefer/avoid/pin ledger |
| `CreatorHardRule.source` `'operator'` | SNS-AI | `account.instructions` / `profile.avoid` prose | optional_unavailable | n/a | not structured as `CreatorHardRule` |
| `CreatorHardRule.pinned` | My-SNS | none on Brand Profile | optional_unavailable | n/a | SNS-AI `pin` feedback is a different store |
| SNS-AI profile → CreatorProfileSnapshot | SNS-AI | `config/accounts.json` `profile.identity/goal/audience/style/avoid` + `instructions` | blocked | n/a | shape is free-form prose, not BrandProfile columns; do not coerce without an explicit adapter spec |

---

## 3. HumanCorrectionEvent

Source of truth: My-SNS `DraftRevision` + `aiOriginalSnapshot` + `wasRevisionEditedByHuman` (`src/lib/repositories/supabase/draft-revisions.ts`).

Emit **only** when: `source === 'ai'` AND snapshot exists AND at least one of title/body/cta/hashtag-set differs. Unedited approval → **no event**. Template source → **no event**.

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `HumanCorrectionEvent.eventId` | My-SNS | no event id; `DraftRevision.id` is the revision | deterministically_derived | high | none if adapter uses revision id or a hash of it; do not invent a second ledger |
| `HumanCorrectionEvent.creatorId` | My-SNS | see identity | blocked | n/a | no creatorId |
| `HumanCorrectionEvent.workspaceId` | My-SNS | `DraftRevision.workspaceId` | direct | high | none |
| `HumanCorrectionEvent.platform` | My-SNS | `DraftRevision.channel` | direct | high | `line` is not a Bridge Platform; skip non-Platform channels |
| `HumanCorrectionEvent.seedId` | My-SNS | `DraftRevision.seedId` | direct | high | none |
| `HumanCorrectionEvent.draftId` | My-SNS | `DraftRevision.socialDraftId` | direct | high | none |
| `HumanCorrectionEvent.revisionId` | My-SNS | `DraftRevision.id` | direct | high | none |
| `HumanCorrectionEvent.aiGenerationId` | My-SNS | `DraftRevision.aiGenerationId?` | direct | high | optional in source |
| `HumanCorrectionEvent.occurredAt` | My-SNS | `DraftRevision.createdAt` (approval time) | direct | high | none |
| `before.title/body/hashtags/cta` | My-SNS | `DraftRevision.aiOriginalSnapshot` | direct | high | snapshot is first persist, not raw model output (documented limitation) |
| `after.title/body/hashtags/cta` | My-SNS | `DraftRevision.title/body/hashtags/cta` | direct | high | none |
| `changedFields` | My-SNS | same comparison as `wasRevisionEditedByHuman` | deterministically_derived | high | none |
| HumanCorrectionEvent from unedited approval | My-SNS | `wasRevisionEditedByHuman === false` | blocked | high | **must not emit** — current product rule |
| HumanCorrectionEvent from template drafts | My-SNS | `source === 'template'` / no snapshot | blocked | high | **must not emit** |
| HumanCorrectionEvent from reply learning | My-SNS | `src/lib/repositories/supabase/reply-learning.ts` | blocked | high | replies include unedited AI approvals; different signal; out of draft-correction contract |
| HumanCorrectionEvent | SNS-AI | none equivalent (feedback `correct` is a note action, not an AI-vs-human draft diff) | optional_unavailable | n/a | do not treat SNS-AI `correct` as a My-SNS revision diff |

---

## 4. ExplicitFeedbackEvent

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `ExplicitFeedbackEvent` (whole) | My-SNS | no prefer/avoid/correct/pin/note ledger | optional_unavailable | n/a | Brand Profile terms are CreatorProfile, not this event |
| `eventId` | SNS-AI | none; JSONL row has no id | deterministically_derived | medium | none if adapter hashes `at+account+action+note+dimension+value` |
| `creatorId` | SNS-AI | none | blocked | n/a | only `account` |
| `workspaceId` | SNS-AI | none | optional_unavailable | n/a | |
| `accountId` | SNS-AI | `human-feedback.jsonl` `account` | direct | high | none |
| `action` | SNS-AI | `prefer \| avoid \| correct \| pin \| note` (`src/feedback/store.mjs` `ACTIONS`) | direct | high | none |
| `dimension` | SNS-AI | optional string ≤80 | direct | medium | not validated against `GrowthFeatureDimension` |
| `value` | SNS-AI | optional string ≤300 | direct | high | none |
| `note` | SNS-AI | required string ≤4000 | direct | high | none |
| `active` | SNS-AI | `active !== false` | direct | high | none |
| `occurredAt` | SNS-AI | `at` ISO | direct | high | none |
| Pinned vs rolling window | SNS-AI | `recentHumanFeedback`: all `pin` + last `humanFeedbackWindow` (default 40) | deterministically_derived | high | none — preserve pin persistence |

---

## 5. GrowthFeatureDimension

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `topic` `angle` `hook` `emotion` `format` `cta` `mediaDecision` | SNS-AI | `FEATURE_DIMENSIONS` + AI `CANDIDATE_SCHEMA` + `history.features` | direct | high | none for SNS-AI posts that stored features |
| `postingHour` | SNS-AI | derived in `historyFeatures` from `entry.at` + timezone | deterministically_derived | high | not AI-emitted |
| `trendUsed` | SNS-AI | AI schema required boolean | optional_unavailable | high | **not** a Bridge `GrowthFeatureDimension` |
| All feature dimensions on My-SNS drafts/posts | My-SNS | not stored on `SocialDraft` / `DraftRevision` / `PublishJob` | optional_unavailable | n/a | do not infer topic/hook/etc. from copy in v1 |
| My-SNS `DraftRevision.cta` | My-SNS | copy string | optional_unavailable | n/a | not the SNS-AI feature enum (`none`/`soft`) |
| My-SNS `Asset.mediaRole` | My-SNS | `source\|variant\|thumbnail\|cover\|eyecatch` | optional_unavailable | n/a | not `mediaDecision` |

---

## 6. PublishedPostSnapshot

### 6.1 My-SNS

Emit only from known successful publication truth (see My-SNS audit §5.7).

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `postId` | My-SNS | no single post table; `PublishJob.id` or success `PublishAttempt.id` | deterministically_derived | medium | adapter must pick one and document it; job id is the operational handle |
| `creatorId` | My-SNS | see identity | blocked | n/a | |
| `workspaceId` | My-SNS | `PublishJob.workspaceId` | direct | high | none |
| `accountId` | My-SNS | `PublishJob.socialAccountId?` | direct | medium | nullable |
| `platform` | My-SNS | `PublishJob.channel` | direct | high | skip non-Platform channels |
| `revisionId` | My-SNS | `PublishJob.revisionId` | direct | high | none |
| `seedId` | My-SNS | `PublishJob.seedId` | direct | high | none |
| `externalPostId` | My-SNS | `PublishAttempt.externalPostId` on `status='success'` | direct | medium | often missing on manual/zero-cost; TikTok may store `publish_id` not public post id |
| `externalUrl` | My-SNS | `PublishAttempt.externalUrl?` | direct | medium | optional; TikTok never sets |
| `publishedAt` | My-SNS | `PublishJob.publishedAt` when `status='published'` | direct | high | prefer job timestamp over attempt `createdAt` |
| `text` | My-SNS | `DraftRevision.body` via `revisionId` | direct | high | none |
| `media[]` | My-SNS | Seed assets / `select-publish-media.ts` / `Asset.type` + `mediaRole` | deterministically_derived | medium | signed URLs must **not** be copied; type/role only |
| `features` | My-SNS | none | optional_unavailable | n/a | |
| `experimentAssignment` | My-SNS | none | optional_unavailable | n/a | |
| Published from `scheduled`/`draft`/`failed`/`cancelled`/partial/unknown/TikTok pending | My-SNS | those job states | blocked | high | **must not emit** |

### 6.2 SNS-AI

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `postId` | SNS-AI | no UUID; `providerPostId` or `slotId` | deterministically_derived | medium | adapter must pick; `providerPostId` is the metrics join key |
| `creatorId` | SNS-AI | none | blocked | n/a | |
| `workspaceId` | SNS-AI | none | optional_unavailable | n/a | |
| `accountId` | SNS-AI | history `account` | direct | high | none |
| `platform` | SNS-AI | history `platform` (`x` / `instagram` in current accounts) | direct | high | none for configured platforms |
| `revisionId` / `seedId` | SNS-AI | none | optional_unavailable | n/a | |
| `externalPostId` | SNS-AI | history `providerPostId` | direct | high | required for learning |
| `externalUrl` | SNS-AI | not a first-class history field at this SHA | optional_unavailable | n/a | do not invent |
| `publishedAt` | SNS-AI | history `at` | direct | high | none |
| `text` | SNS-AI | history `text` | direct | high | none |
| `media[]` | SNS-AI | `mediaType` / `mediaUrl` presence | deterministically_derived | medium | do not copy hosted/signed URLs into contracts |
| `features` | SNS-AI | history `features` + `historyFeatures` | direct / deterministically_derived | high | `postingHour` derived |
| `experimentAssignment` | SNS-AI | history `experiment` `{id,dimension,variant}` | direct | high | only when present and `applied !== false` |
| Dry-run / non-published history | SNS-AI | `status !== 'published'` or missing `providerPostId` | blocked | high | **must not emit** |

---

## 7. MetricSnapshot / RawMetricVector

### 7.1 My-SNS — persistence blocked

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `MetricSnapshot` (whole, durable) | My-SNS | **no metrics table**; live `PostMetrics` only (`src/lib/domain/types.ts`, `/api/analytics/metrics`) | blocked | n/a | no `snapshotId`, no `capturedAt` series, no `checkpointMinutes`, live fetch needs provider credentials (forbidden in Bridge) |
| `checkpointMinutes` | My-SNS | none | blocked | n/a | no checkpoint model |
| Join via external post id | My-SNS | success `publish_attempts.external_post_id` | direct | medium | required for live fetch; often missing on manual publish |

Live-only field notes (not a MetricSnapshot mapping; recorded so Phase 5 does not invent them):

| Live `PostMetrics` field | Provider | Canonical `RawMetricVector` |
|---|---|---|
| `views` (X: `impression_count`) | X, YouTube | **semantic mismatch**: X impressions are labeled `views`. Do not map to `views` without an explicit rule |
| `likes` | X, YouTube | **not in** canonical `RawMetricVector` |
| `comments` | X, YouTube | `comments` |
| `shares` (X: `retweet_count`) | X only | `shares` / `reposts` — X retweets are labeled `shares` |

Instagram/TikTok/Threads/Facebook/note/website live metrics: unavailable.

### 7.2 SNS-AI — durable JSONL

Source: `data/metrics.jsonl` via `src/analytics/store.mjs` / collectors.

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `snapshotId` | SNS-AI | none | deterministically_derived | medium | none if adapter hashes `account+providerPostId+checkpointMinutes+collectedAt` |
| `postId` | SNS-AI | see published post mapping | deterministically_derived | medium | must match PublishedPostSnapshot `postId` convention |
| `creatorId` | SNS-AI | none | blocked | n/a | |
| `workspaceId` | SNS-AI | none | optional_unavailable | n/a | |
| `accountId` | SNS-AI | snapshot `account` | direct | high | none |
| `platform` | SNS-AI | snapshot `platform` | direct | high | none |
| `externalPostId` | SNS-AI | `providerPostId` | direct | high | none |
| `capturedAt` | SNS-AI | `collectedAt` | direct | high | none |
| `checkpointMinutes` | SNS-AI | `checkpointMinutes` | direct | high | none |
| `metrics.impressions` | SNS-AI | X `impressions` | direct | high | IG collector does not write `impressions` |
| `metrics.reach` | SNS-AI | IG `reach` | direct | high | X collector does not write `reach` |
| `metrics.views` | SNS-AI | IG `views` | direct | high | X uses `impressions`, not `views`; scorer `exposure = impressions \|\| reach \|\| views` |
| `metrics.reposts` | SNS-AI | X `reposts` | direct | high | |
| `metrics.quotes` | SNS-AI | X `quotes` | direct | high | |
| `metrics.shares` | SNS-AI | IG `shares` | direct | high | |
| `metrics.bookmarks` | SNS-AI | X `bookmarks` | direct | high | |
| `metrics.saved` | SNS-AI | IG `saved` | direct | high | |
| `metrics.replies` | SNS-AI | X `replies` | direct | high | |
| `metrics.comments` | SNS-AI | IG `comments` | direct | high | |
| `metrics.profileClicks` | SNS-AI | X `profileClicks` (private metrics; may be 0) | direct | medium | unavailable without private X metrics |
| `metrics.profileVisits` | SNS-AI | IG `profileVisits` | direct | high | |
| `metrics.urlClicks` | SNS-AI | X `urlClicks` (private) | direct | medium | same private-metrics caveat |
| `metrics.follows` | SNS-AI | IG `follows` | direct | high | |
| `metrics.videoViews` | SNS-AI | X `videoViews` | direct | high | |
| `metrics.playback100` | SNS-AI | X `playback100` | direct | high | |
| `metrics.reelSkipRate` | SNS-AI | IG `reelSkipRate` | direct | high | 0..1 expected by scorer |
| `likes` (source-only) | SNS-AI | X/IG `likes` | optional_unavailable | high | collected but unused by `metricVector`; **not** in canonical RawMetricVector |
| `engagements` `playback25/50/75` `reelWatchTimeMs` `reelAvgWatchTimeMs` `totalInteractions` | SNS-AI | collectors | optional_unavailable | high | not in canonical vector; scorer ignores them |
| YouTube/TikTok MetricSnapshot | SNS-AI | collector only X/IG | optional_unavailable | n/a | no collector |

---

## 8. NormalizedMetricVector / PerformanceScore

These are **computed**, not persisted in My-SNS. Source behavior: `src/analytics/scorer.mjs`.

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `NormalizedMetricVector.exposure` | SNS-AI | `metricVector.exposure` | direct | high | none |
| `.shareRate` `.saveRate` `.conversationRate` `.profileRate` `.clickRate` `.followRate` `.watchQuality` | SNS-AI | same | direct | high | none |
| `PerformanceScore.score` | SNS-AI | `scoreSnapshot.score` (0..100, 1 decimal) | direct | high | none |
| `PerformanceScore.confidence` | SNS-AI | `0.7*(baselineCount/10)+0.3*log10(exposure+1)/4` | direct | high | none |
| `PerformanceScore.baselineCount` | SNS-AI | `baselineVector.count` | direct | high | none |
| `PerformanceScore.vector` | SNS-AI | `metricVector` | direct | high | none |
| `PerformanceScore.baseline` | SNS-AI | median of account/platform(/checkpoint) peers | direct | high | none |
| `PerformanceScore.components` | SNS-AI | per-weight `relativeScore` | direct | high | none |
| `PerformanceScore.postId` | SNS-AI | see post identity | deterministically_derived | medium | same convention as PublishedPostSnapshot |
| Scoring from My-SNS live PostMetrics | My-SNS | four-field live JSON, no peers, no checkpoint | blocked | n/a | cannot run account-relative baseline without a peer series |

Phase 3 must golden-test against this scorer. Unknown platform currently inherits **X weights** — preserve unless a later change is explicitly approved.

---

## 9. StrategyPattern / GrowthStrategySnapshot

Source: `src/learning/learn.mjs` `buildStrategy` → `data/strategies/<accountId>.json`.

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `strategyId` | SNS-AI | none | optional_unavailable | n/a | Bridge must generate; not current SNS-AI |
| `strategyVersion` | SNS-AI | none | optional_unavailable | n/a | |
| `creatorId` | SNS-AI | none | blocked | n/a | |
| `workspaceId` | SNS-AI | none | optional_unavailable | n/a | |
| `accountId` | SNS-AI | strategy `account` | direct | high | none |
| `platform` | SNS-AI | not stored on strategy JSON | optional_unavailable | n/a | account config has platform; strategy file does not |
| `generatedAt` | SNS-AI | `generatedAt` | direct | high | none |
| `sourceWindow.strategyWindowDays` | SNS-AI | `strategyWindowDays` default 60 | direct | high | none |
| `sourceWindow.from` / `to` | SNS-AI | not stored; implied by `generatedAt` − window | deterministically_derived | medium | none if adapter computes from `generatedAt` + windowDays |
| `sourceWindow.matureCheckpointMinutes` | SNS-AI | learn filter default 1440; not copied onto JSON | deterministically_derived | high | none from `account.learning.matureCheckpointMinutes` |
| `sampleSize` | SNS-AI | `sampleSize` | direct | high | none |
| `overallScore` | SNS-AI | `overallScore` | direct | high | none |
| `confidence` | SNS-AI | `clamp(sampleSize / 20, 0, 1)` | direct | high | none |
| `exploreRate` | SNS-AI | `exploreRate` default 0.2 | direct | high | none |
| `preferred[]` / `avoid[]` | SNS-AI | top 8 lift>0 / top 6 lift<0, `n >= minSamplesPerPattern` (2) | direct | high | current items lack `rationale` and `evidencePostIds` |
| `StrategyPattern.dimension/value/sampleSize/averageScore/lift/confidence` | SNS-AI | `n`, `averageScore`, `lift`, `confidence` | direct | high | `sampleSize` ← `n` |
| `StrategyPattern.rationale` | SNS-AI | none on pattern objects | optional_unavailable | n/a | Bridge addition |
| `StrategyPattern.evidencePostIds` | SNS-AI | not stored on strategy JSON | optional_unavailable | n/a | Bridge addition; samples exist only in-memory during `buildStrategy` |
| `hardConstraintsDigest` | SNS-AI | none | optional_unavailable | n/a | |
| `inputsDigest` | SNS-AI | none | optional_unavailable | n/a | Bridge addition |
| `status` `'active'\|'insufficient-evidence'\|'invalid-input'` | SNS-AI | none; empty still writes JSON with zeros | optional_unavailable | n/a | current code does not distinguish insufficient-evidence |
| `guardrail` (SNS-AI-only string) | SNS-AI | strategy `guardrail` | optional_unavailable | high | not a Bridge contract field; preserve as consumer context |
| GrowthStrategySnapshot from My-SNS metrics | My-SNS | no durable metrics | blocked | n/a | cannot learn audience performance from My-SNS today |

Priority reminder (must be preserved by any later consumer):

```text
Safety / platform rules
> current explicit human instruction
> Brand Profile hard constraints
> pinned / explicit creator feedback
> human correction learning
> audience performance strategy
> trend / exploration guidance
```

SNS-AI already encodes this in `generationPrompt` and strategy `guardrail`. My-SNS encodes Brand Profile > style examples. Neither currently consumes the other product's strategy.

---

## 10. HumanPreferenceSummary / CandidateAdvice

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `HumanPreferenceSummary` (persisted object) | both | **not persisted**. My-SNS computes few-shot on the fly; SNS-AI reads JSONL | optional_unavailable | n/a | v1 may keep My-SNS few-shot as-is (`docs/CONTRACTS.md` §13) |
| Preference from Brand Profile | My-SNS | `preferredTerms` / `avoidedTerms` | direct into CreatorProfile, not this summary | high | do not duplicate as inferred preference |
| Preference from corrections | My-SNS | `listRecentAiRevisionsForStyleLearning` (bodies only, 2/channel) | deterministically_derived | high | only as existing few-shot; no confidence scores stored |
| Preference from SNS-AI feedback | SNS-AI | `human-feedback.jsonl` | deterministically_derived | high | map via ExplicitFeedbackEvent first |
| `CandidateAdvice` | both | not a stored type. SNS-AI ranking is runtime (`strategy-rank.mjs`) | optional_unavailable | n/a | Phase 9 concern, not Phase 1 |

---

## 11. Experiment contracts

My-SNS: **no** experiment types/tables.

SNS-AI: `src/experiments/engine.mjs` + `data/experiments/<account>.json`.

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `ExperimentDefinition` | My-SNS | none | optional_unavailable | n/a | |
| `ExperimentDefinition.experimentId` | SNS-AI | `active.id` = `{accountId}-{dim}-{YYYY-MM-DD}-{round+1}` | direct | high | none |
| `creatorId` | SNS-AI | none | blocked | n/a | |
| `accountId` | SNS-AI | experiment state `account` / id prefix | direct | high | none |
| `platform` | SNS-AI | not on experiment JSON; from account config | deterministically_derived | high | none if adapter reads account.platform |
| `dimension` | SNS-AI | `hook \| format \| cta \| mediaDecision` | direct | high | subset of GrowthFeatureDimension |
| `control` / `variant` | SNS-AI | `variants[]` (two strings; no named control) | deterministically_derived | medium | adapter may treat `variants[0]` as control — **convention, must be explicit** |
| `startedAt` | SNS-AI | `startedAt` | direct | high | none |
| `status` `'planned'\|'running'\|'completed'\|'cancelled'` | SNS-AI | `active` / `completed` / `expired` | blocked | n/a | vocabulary differs (`expired` ≠ `cancelled`; no `planned`/`running` names). Do not rename silently |
| `ExperimentAssignment` | SNS-AI | `assignmentForSlot` `{id,dimension,variant,index}` | direct | high | `experimentId` ← `id` |
| `ExperimentResult.completedAt` | SNS-AI | `completedAt` | direct | high | none |
| `controlScore` / `variantScore` | SNS-AI | `stats[variant].averageScore` | deterministically_derived | medium | depends on control/variant convention |
| `confidence` | SNS-AI | `min(1, min_n / max(3, minSamples*2))` if enough else 0 | direct | high | none |
| `outcome` `'control'\|'variant'\|'inconclusive'` | SNS-AI | `winner` or `null` on expire | deterministically_derived | medium | `winner: null` is inconclusive/expired, not Bridge `cancelled` |
| `notes` | SNS-AI | none | optional_unavailable | n/a | |

---

## 12. Runtime / safety posture (not a growth contract, required by the plan)

| Canonical concern | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| SNS-AI manual-only | SNS-AI | `config/runtime-policy.json` `manualOnly: true` | direct | high | **must not be changed by Bridge** |
| Account enabled | SNS-AI | all `enabled: false` | direct | high | do not enable |
| Engagement live | SNS-AI | `liveAccounts: []` | direct | high | do not populate |
| Operational cron | SNS-AI | operational workflows `workflow_dispatch` only | direct | high | do not restore schedule |
| Provider credentials | both | My-SNS `social_account_credentials`; SNS-AI credential files | blocked | high | **forbidden in Bridge contracts/fixtures** |
| My-SNS publish queue | My-SNS | `publish_jobs` / worker | blocked | high | Bridge must not create a second queue or call connectors |

---

## 13. Classification summary for every Phase 2 contract

| Contract | Directly available from | Optional / later | Blocked until |
|---|---|---|---|
| EnvelopeMeta | adapter | — | — |
| Platform | My-SNS channel / SNS-AI account.platform | `line` excluded | — |
| CreatorProfileSnapshot | My-SNS BrandProfile (core fields) | hardRules scope/pinned/must/never | `creatorId`; SNS-AI prose profile coercion |
| HumanCorrectionEvent | My-SNS edited AI DraftRevision | — | `creatorId`; unedited/template/reply paths |
| ExplicitFeedbackEvent | SNS-AI human-feedback.jsonl | My-SNS (absent) | `creatorId` |
| GrowthFeatureDimension | SNS-AI history features | My-SNS (absent); `trendUsed` | — |
| PublishedPostSnapshot | My-SNS published job+success attempt; SNS-AI published history | features/experiment on My-SNS; URL on TikTok | `creatorId`; non-success job states |
| MetricSnapshot | SNS-AI metrics.jsonl | unused collector extras | **entire My-SNS durable mapping**; `creatorId` |
| NormalizedMetricVector / PerformanceScore | SNS-AI `scorer.mjs` | — | scoring from My-SNS live metrics |
| StrategyPattern / GrowthStrategySnapshot | SNS-AI `buildStrategy` | provenance fields Bridge will add | strategy from My-SNS metrics; `creatorId` |
| HumanPreferenceSummary | not persisted | derive later from corrections + feedback | — |
| CandidateAdvice | not persisted | Phase 9 | — |
| ExperimentDefinition/Assignment/Result | SNS-AI experiment engine | My-SNS (absent) | status vocabulary; control/variant naming; `creatorId` |

---

## 14. Can Phase 1 start?

**YES** — for Phase 1 only (strict TypeScript npm workspace, no adapters, no source-repo changes).

### Phase 1 may freeze

- Workspace tooling: Node 22, strict TS, Vitest, ESLint, `npm run check`, CI
- Intention to implement `packages/contracts` in Phase 2 **as specified in `docs/CONTRACTS.md`**, including optional fields
- Scoring parity target = current SNS-AI `scorer.mjs` (Phase 3), including X/IG weight asymmetry and unknown-platform → X weights
- Strategy parity target = current `buildStrategy` semantics (Phase 4), plus Bridge-only provenance fields as **additions**
- Human correction rule = My-SNS `wasRevisionEditedByHuman` (unedited approval is not a correction)

### Must stay optional in contracts / later adapters

- `creatorId` until an explicit convention is chosen
- `workspaceId` on SNS-AI-originated payloads
- My-SNS `MetricSnapshot` (no durable source)
- My-SNS feature dimensions, experiments, explicit feedback
- `CreatorHardRule.scope` / `pinned` / `must` / `never`
- Strategy `status`, `inputsDigest`, `evidencePostIds`, `rationale` (Bridge additions)
- Experiment status rename (`expired` vs `cancelled`)
- `likes` (exists in sources; not in canonical RawMetricVector)

### Critical blockers (not Phase 1, but block later integration phases)

1. **My-SNS has no durable metrics / checkpoints** → Phase 5 MetricSnapshot adapter is blocked; audience-performance learning from My-SNS cannot start.
2. **No first-class `creatorId` in either repo** → adapter identity convention required before any cross-entity snapshot.
3. **No My-SNS ↔ SNS-AI account mapping** → cannot attach one GrowthStrategySnapshot to both products.
4. **X impressions labeled `views` in My-SNS** → metric field mapping needs an explicit rule if My-SNS ever exports metrics.
5. **Default My-SNS publish path is zero-cost/manual** → many published jobs lack `externalPostId`, so even a future metrics export would be sparse.

### What must not happen next

- Do not implement adapters that invent creatorId, metrics checkpoints, or feature tags
- Do not change My-SNS or SNS-AI
- Do not lift SNS-AI manual-only
- Do not add a Bridge database, API, OAuth, or publisher

Recommended next action: **Phase 1 — bootstrap the pure TypeScript workspace** (`docs/IMPLEMENTATION_PLAN.md`). Leave optional/blocked fields optional. Do not start Phase 5 My-SNS metric mapping until a durable My-SNS metric source exists.
