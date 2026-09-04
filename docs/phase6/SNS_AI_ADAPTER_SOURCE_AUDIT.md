# Phase 6 — SNS-AI adapter source audit

Status: **adapter source of truth = current SNS-AI `main`**

Phase 0 historical audit remains in `docs/audit/SNS_AI_CURRENT_STATE.md` and `docs/audit/MAPPING_MATRIX.md`. This file records the facts Phase 6 adapters use.

## Audited SHA

| Item | Value |
|---|---|
| Repository | `sunpotflower4460-cpu/SNS-AI` |
| Branch | `main` |
| Audited commit SHA | `914c70ee4666015f93603eef9a2f3dd9a1a7de08` |
| Commit subject | `Merge pull request #93 from sunpotflower4460-cpu/cursor/multi-brand-growth-os-9200` |
| Phase 0 reference SHA | `3bd90cc8ac80da84df949799dd4b8be2dc109767` |
| Bridge base after PR #14 | `f2adace69917118a21983cce95f8afb141e72dc3` |

## Inspected files

- `src/lib/history.mjs`
- `src/analytics/store.mjs`
- `src/analytics/scorer.mjs`
- `src/analytics/checkpoints.mjs`
- `src/analytics/collector.mjs`
- `src/analytics/x-metrics.mjs`
- `src/analytics/instagram-metrics.mjs`
- `src/learning/learn.mjs`
- `src/learning/features.mjs`
- `src/feedback/store.mjs`
- `src/artist/bridge-contracts.mjs`
- `src/publish-core.mjs` (history row shape at publish)
- `config/runtime-policy.json`
- `config/accounts.json`

No JSONL reader, collector, or runtime policy mutation is part of Phase 6.

## History shape

`appendHistory` (`src/lib/history.mjs`) stamps `at` (ISO) and `textHash`. Publish writes (`src/publish-core.mjs`):

```text
at, account, platform, status, source, slotId, text, mediaUrl, mediaType,
mediaAltText, mediaQa, mediaResolution, commercial, providerPostId, ai,
features, rationale, predictedScore, selectionMode, experiment, sources
```

Publication truth used by metrics collection (`src/analytics/collector.mjs`):

```text
status === 'published' AND providerPostId AND at
```

Phase 6 PublishedPost uses that same gate. Missing `providerPostId` is **not-applicable** (SNS-AI Canonical PublishedPost requires a provider id; unlike My-SNS manual publish).

`learn.mjs` windowing requires `account`, `providerPostId`, and parseable `at` — **not** `status === 'published'`. Strategy-input mapping follows `learn.mjs`, not the collector gate.

There is no first-class internal post id. Deterministic Canonical `postId`:

```text
sns-ai:<account>:<providerPostId>
```

after both components are non-empty.

`platform` is usually stored on the history row. If absent, the caller must pass `platform` explicitly. Adapter never infers platform from `account` or `providerPostId`.

`mediaUrl` may be a private/signed URL. Canonical output never includes the URL. Strategy input uses `hasLegacyMediaUrl: Boolean(mediaUrl)` only.

`mediaType` exists on some rows (`image` / `reel` / …) but is not a proven Canonical `PublishedPost.media[].type` (especially `reel`). Phase 6 emits `media: []`.

## Metrics shape

Durable file: `data/metrics.jsonl` via `src/analytics/store.mjs`.

`appendMetricSnapshot` writes `collectedAt` plus the collector payload:

```text
account, platform, providerPostId, publishedAt,
checkpointMinutes, actualAgeMinutes, metrics, warning?, unavailable?
```

No first-class `snapshotId`. Duplicate rows with the same
`account + providerPostId + checkpointMinutes + collectedAt` are the same snapshot; a deterministic id collision is acceptable.

Default checkpoints: `60, 360, 1440, 4320, 10080`. Adapter does **not** restrict to those five; Canonical `positiveInt` is the gate.

X `metrics` (`normalizeX`): impressions, likes, reposts, replies, quotes, bookmarks, urlClicks, profileClicks, engagements, videoViews, playback25/50/75/100, privateMetricsAvailable.

Instagram `metrics`: views, reach, likes, comments, shares, saved, totalInteractions, follows, profileVisits, reelWatchTimeMs, reelAvgWatchTimeMs, reelSkipRate.

Canonical `RawMetricVector` does **not** include engagements, playback25/50/75, totalInteractions, reelWatchTimeMs, reelAvgWatchTimeMs, privateMetricsAvailable. Those are stripped, not added to the contract.

`likes` is stored raw and unused by `sns-ai-parity-v1`.

## Feedback shape

`src/feedback/store.mjs` / `data/human-feedback.jsonl`.

Actions: `prefer | avoid | correct | pin | note`.

Row: `at, account, action, note, dimension, value, source, active`.

Dedupe key in `recentHumanFeedback`: `at|action|note|dimension|value` after filtering by account. Phase 6 eventId hashes those fields plus `account` and `active` so cross-account collisions cannot share an id.

`source` has no Canonical field → discarded.

`correct` is ExplicitFeedback, **not** My-SNS `HumanCorrectionEvent`.

Unknown non-empty `dimension` is blocked. Empty/whitespace `value` is omitted (Canonical `value` is optional `nonEmptyString`). Empty `note` is blocked (store requires note).

`active: false` is preserved.

## Strategy shape

Phase 4 already ports `buildStrategy()` and `projectToGrowthStrategySnapshot()`. Phase 6 does not reimplement strategy. It only maps history → `StrategyPostEvidence` (`accountId`, `externalPostId`, `publishedAt`, known `features`, `hasLegacyMediaUrl`).

`postingHour` / default `mediaDecision` remain Phase 4 `historyFeatures()` concerns.

Persisted `data/strategies/<account>.json` is not a second Canonical adapter.

## Runtime policy

`config/runtime-policy.json` at this SHA:

```json
{
  "schemaVersion": 1,
  "manualOnly": true,
  "requireExplicitManualInvocation": true,
  "allowAutomaticAccountActivation": false,
  "allowAutomaticEngagement": false,
  "allowScheduledProviderPolling": false
}
```

Phase 6 does not read or change this file. Invariants are frozen in adapter tests.

## Artist Support / bridge-contracts

`src/artist/bridge-contracts.mjs` proposes CreatorActionRecommendation, ArtistContextEvent, ArtistFunnelSnapshot, PublishedPostSnapshot, and `assertNoPrivateStorage`. This is **not** Bridge Canonical. Phase 6 records it as a future mapping candidate only. Private-URL guard is preserved in adapter tests.

## Phase 0 → current relevant drift

1. Multi-brand / Artist Support V2 landed (`27e992f`, `68f9512` on the inspected paths). History / metrics / feedback / scorer / learn semantics used by Phase 6 are unchanged vs Phase 0 for mapping purposes.
2. Canonical `RawMetricVector` now includes `likes` (preservation-only). Phase 0 audit said Canonical had no likes; Phase 3 already preserved likes and ignored them in the scorer. Phase 6 maps likes into raw Canonical and does not score them.
3. Runtime policy remains manual-only.

## Directly convertible

- published history → PublishedPostSnapshot
- metric rows → MetricSnapshot
- human feedback → ExplicitFeedbackEvent
- history → Phase 4 StrategyPostEvidence

## Blocked / ambiguous

- My-SNS workspace ↔ SNS-AI account mapping
- cross-repo post identity (`my-sns:publish-job:…` vs `sns-ai:<account>:<providerPostId>`); future candidate is `platform + externalPostId`
- Artist Support → CreatorAction / HumanAnchor / Orbit / Funnel
- runtime JSONL transport
- Canonical fields missing from RawMetricVector (engagements, playback25/50/75, totalInteractions, reel watch times)
- proven published media type (`media: []`)
- history `source` / `experiment` / `ai` / commercial metadata
- feedback `source`

## Contract change required?

**No.** Missing metric keys stay unavailable rather than expanding schema major 1.
