# Phase 4 — Strategy source audit

Status: **parity target unchanged**

## Audited SHAs

| Item | Value |
|---|---|
| Bridge base `main` | `d4989f38e962274a92cf9b96957ee3805948cbdf` |
| SNS-AI current `main` (parity target) | `914c70ee4666015f93603eef9a2f3dd9a1a7de08` |
| Phase 0 / Phase 3 audit SHA | `3bd90cc8ac80da84df949799dd4b8be2dc109767` |
| SNS-AI local HEAD at audit time | `43a987fe5e9137cc2a688e4870563f9cc8c1079a` (cost-report only; strategy sources identical to `origin/main`) |

## Source blobs (SNS-AI `914c70ee`)

| Path | Blob SHA | vs Phase 0 `3bd90cc` |
|---|---|---|
| `src/learning/learn.mjs` | `9ffae3058c70c873757a87522387c2d62e89e8e9` | **identical** |
| `src/learning/features.mjs` | `aeaaf99fb81511f9cb6ae02578700c103d19589d` | **identical** |
| `src/analytics/store.mjs` | `9075598f8c7507c08bea5b77e42cc33078996afa` | **identical** |
| `src/analytics/scorer.mjs` | `9dc00053858bbf4ed0b7bf2b45e75b137541d8b5` | **identical** |
| `config/accounts.json` | `dd5460c5281fc3d7daadaea3f8657e3418458d02` | changed (accounts/content, not learning defaults) |

Confirmed independently: `learn.mjs` blob is `9ffae3058c70c873757a87522387c2d62e89e8e9` on Phase 0, current `main`, and local HEAD.

## Relevant config (`defaults.learning`)

Unchanged from Phase 0:

```text
enabled                     true
exploreRate                 0.2
matureCheckpointMinutes     1440
strategyWindowDays          60
minSamplesPerPattern        2
fullConfidencePosts         20
humanFeedbackWindow         40
adaptiveSchedule            true
adaptiveScheduleMinConfidence  0.45
adaptiveScheduleKeepAtLeast 1
```

Timezone default remains `Asia/Tokyo`. `defaults.objectives.weights` remains `{}`.

`config/accounts.json` gained Artist Support / multi-brand account entries between Phase 0 and current `main`. Those entries are **not** `buildStrategy()` semantics.

## `latestSnapshots`

Still in `src/analytics/store.mjs`:

```js
key = account + ":" + providerPostId
keep newest collectedAt
```

Bridge parity maps:

| SNS-AI | Bridge |
|---|---|
| `account` | `subject.accountId` |
| `providerPostId` | `externalPostId` |
| `collectedAt` | `capturedAt` |
| history `at` | `publishedAt` |
| history `mediaUrl` truthiness | `StrategyPostEvidence.hasLegacyMediaUrl` |

This is **not** “pick the maximum checkpoint.” Equal timestamps keep the first row.

## Did Strategy Learning semantics change since Phase 0?

**NO.**

`buildStrategy()` body, `historyFeatures()`, `FEATURE_DIMENSIONS`, `latestSnapshots()`, and scorer formulas are the same blobs as Phase 0.

## Did `src/growth/*` or `src/artist/*` replace `buildStrategy()`?

**NO.** Grep of SNS-AI `914c70ee`:

- `buildStrategy` is only defined/used in `src/learning/learn.mjs` and `test/feedback-loop.test.mjs`
- `src/growth` and `src/artist` do not call `buildStrategy` / `learnAll`

Phase 4 parity source remains `src/learning/learn.mjs` `buildStrategy()` only.

## Mapping not frozen in Phase 4

Canonical `PublishedPostSnapshot` has no `mediaUrl`. Phase 4 uses internal `StrategyPostEvidence.hasLegacyMediaUrl` rather than inventing an adapter mapping. Adapter conversion is Phase 5.

## Stop condition

Not triggered. `learn.mjs`, `features.mjs`, and `latestSnapshots` semantics are unchanged. Proceed with `sns-ai-learn-parity-v1`.
