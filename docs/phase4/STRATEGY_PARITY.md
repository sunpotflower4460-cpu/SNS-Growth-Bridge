# Phase 4 — Strategy learning parity

Bridge strategy behavior version: `sns-ai-learn-parity-v1`
Contract schema major: `1` (separate)
Scorer version reused unmodified: `sns-ai-parity-v1` (separate)

## Source

- Repository: `sunpotflower4460-cpu/SNS-AI`
- Parity target SHA: `914c70ee4666015f93603eef9a2f3dd9a1a7de08` (current `main` at audit time)
- `src/learning/learn.mjs` blob: `9ffae3058c70c873757a87522387c2d62e89e8e9`
- `src/learning/features.mjs` blob: `aeaaf99fb81511f9cb6ae02578700c103d19589d`
- `src/analytics/store.mjs` blob: `9075598f8c7507c08bea5b77e42cc33078996afa`
- Byte-identical to the Phase 0/3 reference SHA `3bd90cc8ac80da84df949799dd4b8be2dc109767` for all three files — see `docs/phase4/STRATEGY_SOURCE_AUDIT.md`.

Only `buildStrategy()` is ported. `learnAll()` (JSONL I/O, account loading, audit logging) and the `ensureExperiment()` / `evaluateExperiment()` calls it makes are **not** ported — that is a separate phase.

## Implementation files

- `packages/strategy/src/types.ts` — `FEATURE_DIMENSIONS`, `StrategyPostEvidence`, `StrategyLearningConfig`, `StrategySample`, `StrategyParityResult`, `StrategyPatternEvidence`
- `packages/strategy/src/latest-snapshots.ts`
- `packages/strategy/src/history-features.ts`
- `packages/strategy/src/feature-stats.ts`
- `packages/strategy/src/rank-patterns.ts`
- `packages/strategy/src/build-strategy.ts` — `buildStrategyParity()`
- `packages/strategy/src/canonical-projection.ts` — `projectToGrowthStrategySnapshot()`
- Frozen reference: `packages/strategy/fixtures/reference/sns-ai-learn.mjs`, `sns-ai-features.mjs`, `sns-ai-latest-snapshots.mjs`, `sns-ai-scorer.mjs`

Canonical types (`MetricSnapshot`, `GrowthFeatureDimension`, `GrowthStrategySnapshot`, `StrategyPattern`, `GrowthSubjectRef`, `Platform`, `EnvelopeMeta`) come from `@sns-growth-bridge/contracts`. Scoring is reused unmodified from `@sns-growth-bridge/scoring` (`scoreSnapshot`) — no scoring logic is re-implemented in this package.

## Field mapping (SNS-AI raw shape -> Bridge Parity Core input)

| SNS-AI | Bridge |
|---|---|
| `history[].account` | `StrategyPostEvidence.accountId` |
| `history[].providerPostId` | `StrategyPostEvidence.externalPostId` |
| `history[].at` | `StrategyPostEvidence.publishedAt` |
| `history[].features` | `StrategyPostEvidence.features` |
| `history[].mediaUrl` (truthy check only) | `StrategyPostEvidence.hasLegacyMediaUrl` |
| `snapshot.account` | `MetricSnapshot.subject.accountId` |
| `snapshot.providerPostId` | `MetricSnapshot.externalPostId` |
| `snapshot.collectedAt` | `MetricSnapshot.capturedAt` |
| `snapshot.checkpointMinutes` | `MetricSnapshot.checkpointMinutes` |
| `account.learning.*` | `StrategyLearningConfig.*` |
| `account.objectives.weights` | `StrategyLearningConfig.scoreWeights` |
| `account.schedule.timezone \|\| account.timezone` | `StrategyLearningConfig.timezone` |

`StrategyPostEvidence` and `hasLegacyMediaUrl` are Parity-Core-only internal types. Canonical `PublishedPostSnapshot` has no `mediaUrl` field; how a future adapter derives `hasLegacyMediaUrl` from a canonical snapshot's `media[]` array is an explicit Phase 5+ decision, not made here.

## Formulas and filtering order (do not reorder)

1. **Recent history**: `history` rows where `accountId === accountId`, `externalPostId` is truthy, and `Date.parse(publishedAt) >= now - strategyWindowDays * 86_400_000` (`strategyWindowDays = max(1, config.strategyWindowDays ?? 60)`).
2. **Allowed post ids**: the set of `externalPostId` from step 1.
3. **Window snapshots**: `snapshots` where `subject.accountId === accountId` and `externalPostId ∈ allowedPostIds`. This full, non-deduplicated, non-mature-filtered list is the **scoring peer set** for every sample (step 7) — not just the mature/latest ones.
4. **Latest per post**: `latestSnapshots(windowSnapshots)` — newest `capturedAt` per `accountId:externalPostId`; ties keep the first-encountered row. This is "most recently collected", not "highest `checkpointMinutes`".
5. **Mature filter**: keep only `checkpointMinutes >= matureCheckpointMinutes` (default `1440`), applied **after** step 4. See the critical quirk below.
6. **Post join**: look up each surviving snapshot's post in `recentHistory` by `externalPostId` (last entry wins on duplicate ids, same as `new Map(array)`); drop snapshots with no matching post.
7. **Score**: `scoreSnapshot(snapshot, windowSnapshots, scoreWeights)` from `@sns-growth-bridge/scoring` — peers are the full window snapshot set from step 3.
8. **Features**: `historyFeatures(post, timezone)`.
9. **Overall score**: `mean(sample.score)` if any samples, else `50`. Rounded to 1 decimal.
10. **Feature grouping**: for each of the 8 `FEATURE_DIMENSIONS` (in order), group samples by `String(value || '').trim()`, skipping blank values. Every dimension gets a `featureStats[dimension]` entry even if empty.
11. **Feature stats**: `n = scores.length`; `averageScore = round1(mean(scores))`; `lift = round1(mean(scores) - overallScore)`; `confidence = round2(clamp(n / 6, 0, 1))`. The `6` denominator is fixed and unrelated to `fullConfidencePosts`.
12. **Ranking**: build `ranked` from patterns with `n >= minSamplesPerPattern` (default `2`), walking dimensions in `FEATURE_DIMENSIONS` order and values in first-encountered order; stable-sort by `lift` descending; `preferred` = `lift > 0`, first 8; `avoid` = the `lift < 0` subset of that same order, stable-sorted ascending by `lift` (worst first), first 6. `lift === 0` patterns are excluded from both lists.
13. **Strategy confidence**: `round2(clamp(sampleSize / fullConfidencePosts, 0, 1))` (default `fullConfidencePosts = 20`).
14. **exploreRate**: `Number(config.exploreRate ?? 0.2)`, copied through unclamped — not validated against `0..1` at Parity Core (Bridge canonical `GrowthStrategySnapshot.exploreRate` does clamp `0..1`; an out-of-range config value would only fail at the canonical-projection boundary, not silently at Parity Core).
15. **Guardrail**: fixed string `"Treat these as recent evidence, not identity. Never override profile, safety rules, or explicit human instructions."`.

Scores are **not** confidence-weighted, exposure-weighted, recency-weighted, or Bayesian-shrunk — plain arithmetic mean, matching SNS-AI exactly. `StrategySample.scoreConfidence` (from the Phase 3 scorer's own `confidence`) is carried on the sample but never used by the grouping/ranking math, matching current SNS-AI behavior.

## Feature dimensions (order is behavior)

```text
topic, angle, hook, emotion, format, cta, mediaDecision, postingHour
```

No dimension may be added, removed, or reordered without a new strategy-behavior version.

## `-0` normalization

`round1`/`round2` normalize a `Math.round` result of `-0` to `0` (via `|| 0`). SNS-AI's real persisted strategy JSON goes through `JSON.stringify`, which already collapses `-0` to `"0"` — this keeps true observable parity with any real SNS-AI consumer rather than diverging from it. Golden fixtures (generated the same way, through `JSON.stringify`) already reflect the normalized value.

## Golden fixtures

Generated from the frozen SNS-AI `buildStrategy()` (not from the TypeScript port) via `node packages/strategy/scripts/generate-golden.mjs`:

- `no-samples`, `one-sample`, `normal-multi-sample`
- `window-exclusion`, `wrong-account-exclusion`, `missing-external-post-id-exclusion`
- `latest-snapshot-selection`, `latest-immature-drops-mature-history` (the critical quirk, see below), `mature-boundary-inclusion`
- `same-feature-grouped`, `min-samples-filter`
- `preferred-positive-lift`, `avoid-negative-lift`, `zero-lift-excluded`
- `preferred-cap-8`, `avoid-cap-6`
- `feature-confidence-n-over-6`, `overall-score-rounding`, `strategy-confidence-sample-size-over-20`
- `custom-full-confidence-posts`, `custom-explore-rate`, `custom-strategy-window-days`, `custom-mature-checkpoint-minutes`
- `posting-hour-asia-tokyo`, `posting-hour-custom-timezone`
- `media-decision-existing-preserved`, `media-decision-fallback-library`, `media-decision-fallback-none`
- `score-weight-override`, `tie-stable-sort`

30 fixtures, covering every case in the Phase 4 instructions' minimum list (items 1-30), with items 8/39 (the critical "latest immature snapshot drops an otherwise-mature post" quirk) combined into `latest-immature-drops-mature-history`.

## Exact-match status

All 30 golden fixtures compared with `toEqual` against `buildStrategyParity(...).parity`. **Target: 30/30 exact.**

## Canonical projection boundary

`buildStrategyParity()` returns `{ parity, patternEvidence }`:

- `parity: StrategyParityResult` is field-for-field identical to SNS-AI's `buildStrategy()` return shape (`account`, `generatedAt`, `strategyWindowDays`, `sampleSize`, `overallScore`, `confidence`, `exploreRate`, `preferred`, `avoid`, `featureStats`, `guardrail`). This is what golden tests compare — Bridge-only fields never appear here and Canonical-Projection additions never feed back into it.
- `patternEvidence: StrategyPatternEvidence[]` is a sidecar collected during feature grouping (`{ dimension, value, externalPostIds }`), used only to fill `StrategyPattern.evidencePostIds` on the canonical projection. It is not part of the SNS-AI-comparable output.

`projectToGrowthStrategySnapshot({ parity, patternEvidence, subject, platform, meta, strategyId, inputsDigest, matureCheckpointMinutes, hardConstraintsDigest? })` is a separate, pure, deterministic function that:

- sets `strategyVersion` to `sns-ai-learn-parity-v1`
- computes `sourceWindow.from/to` from `generatedAt - strategyWindowDays` / `generatedAt`
- sets `status: 'insufficient-evidence'` when `parity.sampleSize === 0`, else `'active'` — this falls out naturally from `buildStrategyParity` (zero samples already yields `overallScore: 50`, `confidence: 0`, empty `preferred`/`avoid`, since `ranked` can never contain a pattern when there are no samples), so the projection does not need to separately force those fields
- maps each `LegacyStrategyPattern` to a canonical `StrategyPattern`, filling `sampleSize` from `n`, and `evidencePostIds` from the matching `patternEvidence` entry (empty array if none found)
- generates a deterministic, non-LLM `rationale` string per pattern (e.g. `hook="ask" had +18.4 lift versus the account's recent overall score across 7 mature samples.`) — explanatory only, never fed back into scoring/ranking

`strategyId` and `inputsDigest` are **required caller inputs**, not invented here — per the Phase 4 instructions, when a safe, canonicalization-proof deterministic hash isn't in scope, the caller supplies these instead of the Bridge fabricating a random UUID/hash.

## Intentional quirks preserved

- **Latest-before-mature ordering** (`latest-immature-drops-mature-history`): a post's newest-collected snapshot is selected *before* the mature-checkpoint filter is applied. If that newest snapshot is immature, the post is dropped from learning entirely — even if an older, mature snapshot exists for the same post in the window. This is counter-intuitive but is exactly what SNS-AI does; it is not "fixed" here. See `docs/phase4/FUTURE_STRATEGY_IMPROVEMENTS.md`.
- **Scoring peers are the whole window, not just mature/latest samples.**
- **Feature confidence denominator is `6`**, independent of `fullConfidencePosts` (`20`).
- **`exploreRate` is copied through unclamped** at Parity Core.
- **No confidence/exposure/recency weighting or Bayesian shrinkage** anywhere in the average/lift math.
- **Unknown-platform -> X scoring weights fallback** (inherited unchanged from `@sns-growth-bridge/scoring`, Phase 3).
- **`likes` ignored** in scoring (inherited unchanged from Phase 3).

## Not implemented in this phase

- `learnAll()` I/O (account loading, JSONL history/metrics reads, strategy file writes, audit logging)
- `ensureExperiment()` / `evaluateExperiment()` — experiment lifecycle
- SNS-AI adapters (`data/metrics.jsonl`, `data/history.jsonl`, `config/accounts.json` readers, strategy file writer)
- Artist Support V2 / Human Anchor / Orbit / Creator Action generation
- growth objectives / explore modules / budget governor / multi-brand logic
- My-SNS integration (Draft, Brand Profile, Revision, Metric, Publish)

## Future improvement candidates

See `docs/phase4/FUTURE_STRATEGY_IMPROVEMENTS.md`. Not implemented in Phase 4.
