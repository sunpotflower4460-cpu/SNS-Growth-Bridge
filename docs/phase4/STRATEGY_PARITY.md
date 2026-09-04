# Phase 4 — Strategy learning parity

Bridge strategy behavior version: `sns-ai-learn-parity-v1`  
Scorer behavior version: `sns-ai-parity-v1` (unchanged, reused)  
Contract schema major: `1` (separate)

These three versions are independent.

## Source

- Repository: `sunpotflower4460-cpu/SNS-AI`
- Parity target SHA: `914c70ee4666015f93603eef9a2f3dd9a1a7de08`
- `src/learning/learn.mjs` blob: `9ffae3058c70c873757a87522387c2d62e89e8e9`
- `src/learning/features.mjs` blob: `aeaaf99fb81511f9cb6ae02578700c103d19589d`
- `src/analytics/store.mjs` blob: `9075598f8c7507c08bea5b77e42cc33078996afa`
- Frozen references:
  - `packages/strategy/fixtures/reference/sns-ai-learn.mjs`
  - `packages/strategy/fixtures/reference/sns-ai-features.mjs`
  - `packages/strategy/fixtures/reference/sns-ai-latest-snapshots.mjs`
- Scoring: `@sns-growth-bridge/scoring` `scoreSnapshot()` (no new scorer)

Regenerate goldens with `node packages/strategy/scripts/generate-golden.mjs`. Expected output is produced by frozen SNS-AI `buildStrategy`, not by the TypeScript port.

## Field mapping

| SNS-AI | Bridge parity input |
|---|---|
| history `account` | `StrategyPostEvidence.accountId` |
| history `providerPostId` | `StrategyPostEvidence.externalPostId` |
| history `at` | `StrategyPostEvidence.publishedAt` |
| history `features` | `StrategyPostEvidence.features` |
| history `mediaUrl` | `StrategyPostEvidence.hasLegacyMediaUrl` |
| snapshot `account` | `MetricSnapshot.subject.accountId` |
| snapshot `providerPostId` | `MetricSnapshot.externalPostId` |
| snapshot `collectedAt` | `MetricSnapshot.capturedAt` |
| `account.learning.*` | `StrategyLearningConfig` (source-neutral; not the SNS-AI account object) |
| `account.schedule.timezone \|\| account.timezone` | `StrategyLearningConfig.timezone` |
| `account.objectives.weights` | `StrategyLearningConfig.scoreWeights` |

## Filtering order (do not reorder)

```text
1. windowDays = max(1, Number(strategyWindowDays ?? 60))
2. cutoff = now - windowDays * 86_400_000
3. recentHistory = account match AND externalPostId truthy AND Date.parse(publishedAt) >= cutoff
4. allowedPostIds from recentHistory
5. windowSnapshots = same account AND externalPostId ∈ allowedPostIds
6. latestSnapshots(windowSnapshots) by newest capturedAt
7. THEN mature filter: checkpointMinutes >= matureCheckpointMinutes (default 1440)
8. join latest mature snapshot to history Map (later history row wins)
9. scoreSnapshot(snapshot, windowSnapshots, scoreWeights)
   peers = windowSnapshots (all window rows, not latest-only, not mature-only)
10. historyFeatures(post, timezone)
```

Critical quirk: if snapshot A (checkpoint 1440, captured first) and snapshot B (checkpoint 360, captured later) exist for the same post, latest is B, then mature filter drops the post.

## Formulas (copied, not improved)

```text
overall = samples.length ? mean(sample.score) : 50
overallScore = round(overall, 1 decimal)
lift uses unrounded overall, then round(mean(group) - overall, 1 decimal)
feature averageScore = round(mean(scores), 1 decimal)
feature confidence = round(clamp(n / 6, 0, 1), 2 decimal)
strategy confidence = round(clamp(sampleSize / fullConfidencePosts, 0, 1), 2 decimal)
exploreRate = Number(exploreRate ?? 0.2)
```

Pattern ranking:

1. `stat.n >= minSamplesPerPattern` (default 2) → rank candidate
2. sort lift descending (JS stable sort)
3. preferred: `lift > 0`, cap 8
4. avoid: `lift < 0`, re-sort lift ascending, cap 6
5. `lift == 0` enters neither list
6. n=1 remains in `featureStats` but is not a rank candidate

Feature averages are a simple mean of scores. Scorer `confidence` is stored on the sample and is **not** used as a weight.

## Feature dimensions (order preserved)

```text
topic
angle
hook
emotion
format
cta
mediaDecision
postingHour
```

`historyFeatures`:

- copy features
- if `mediaDecision` is falsy: `hasLegacyMediaUrl ? 'library' : 'none'`
- if `publishedAt` is present: `postingHour = HH:00` via `Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' })`
- timezone default `Asia/Tokyo`

## Implementation files

Parity core (compared to SNS-AI):

- `packages/strategy/src/build-strategy.ts` → `buildStrategyParity()`
- `packages/strategy/src/latest-snapshots.ts`
- `packages/strategy/src/history-features.ts`
- `packages/strategy/src/samples.ts`
- `packages/strategy/src/feature-stats.ts`
- `packages/strategy/src/rank-patterns.ts`

Canonical projection (Bridge-added; **not** in golden parity):

- `packages/strategy/src/canonical-projection.ts` → `projectToGrowthStrategySnapshot()`

Canonical extras: `strategyId`, `strategyVersion`, `subject`, `platform`, `sourceWindow`, `inputsDigest`, `rationale`, `evidencePostIds`, `status`. These must not flow back into parity calculation.

`inputsDigest` is a caller-required projection field (no random hash).

Insufficient evidence (Canonical only):

```text
sampleSize === 0 → status insufficient-evidence
sampleSize 0, confidence 0, preferred [], avoid [], overallScore 50
```

SNS-AI legacy still writes a strategy object with those zeros and no `status` field.

## Golden fixtures

33/33 exact `toEqual` matches against frozen SNS-AI `buildStrategy`.

| Fixture | Case |
|---|---|
| `no-samples` | empty evidence |
| `one-sample` | single mature sample |
| `normal-multi-sample` | mixed high/mid/low |
| `strategy-window-exclusion` | post older than 60 days dropped |
| `wrong-account-exclusion` | other accountId dropped |
| `missing-external-post-id-exclusion` | falsy history id dropped |
| `latest-snapshot-selection` | newest `capturedAt` wins among mature rows |
| `immature-latest-exclusion` | latest checkpoint 360 dropped |
| `mature-snapshot-inclusion` | checkpoint 1440 kept |
| `latest-then-immature-drops-post` | mature first, immature captured later → post dropped |
| `same-feature-grouped` | same hook values grouped |
| `min-samples-filter` | n=1 in stats, not in preferred/avoid |
| `preferred-positive-lift` | `lift > 0` |
| `avoid-negative-lift` | `lift < 0` |
| `zero-lift-excluded` | `lift == 0` in neither list |
| `preferred-cap-8` | 9 tied positive topics → first 8 |
| `avoid-cap-6` | 7 tied negative topics → first 6 |
| `feature-confidence-n-over-6` | n=3 → confidence 0.5 |
| `overall-score-rounding` | 1 decimal overall |
| `strategy-confidence-sample-size-over-20` | 4/20 → 0.2 |
| `custom-full-confidence-posts` | 4/10 → 0.4 |
| `custom-explore-rate` | 0.5 copied through |
| `custom-strategy-window-days` | 7-day window |
| `custom-mature-checkpoint-minutes` | 4320 threshold |
| `posting-hour-asia-tokyo` | `09:00` |
| `custom-timezone` | America/New_York `20:00` |
| `media-decision-existing-preserved` | `generate` kept |
| `media-decision-fallback-library` | legacy mediaUrl → `library` |
| `media-decision-fallback-none` | no mediaUrl → `none` |
| `score-weight-override` | Phase 3 scorer weights |
| `tie-stable-sort` | topic before hook at equal lift |
| `history-map-overwrite` | later history row wins |
| `scoring-peers-are-window-snapshots` | immature window rows still score peers |

## Intentional quirks (preserved)

- latest snapshot is chosen **before** mature filtering
- lift uses unrounded overall, then rounds
- feature confidence denominator is **6**, not `fullConfidencePosts`
- low-confidence scores are still one sample each
- `now` is injected; no implicit clock in the parity core
- performance strategy is not creator identity (guardrail string verbatim)
- human feedback and experiments are not mixed in

## Intentional non-changes

- My-SNS unchanged
- SNS-AI unchanged
- no adapters
- no experiments
- no CreatorAction / Anchor / Orbit generation
- no JSONL / database / provider I/O
