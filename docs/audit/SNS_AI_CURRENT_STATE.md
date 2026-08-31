# SNS-AI Current State — Phase 0 Audit

Status: audit only. No SNS-AI code was changed. Manual-only posture was not modified.

## Audit metadata

| Item | Value |
|---|---|
| Repository | `sunpotflower4460-cpu/SNS-AI` |
| Branch | `main` |
| Audited commit SHA | `3bd90cc8ac80da84df949799dd4b8be2dc109767` |
| Commit subject | `Merge pull request #92 from sunpotflower4460-cpu/cursor/merge-pending-audit-fixes-2537` |
| Commit datetime | `2026-08-31T06:36:06Z` |
| Audit datetime UTC | `2026-08-31T07:44:25Z` |
| Persistence | JSON / JSONL files under `data/`. No shared SQL database. |
| Runtime | Node ESM (`.mjs`). GitHub Actions for ops. |

This audit prefers current implementation over roadmap prose.

---

## 1. Identity model

Primary key is **`accountId`**: string keys under `config/accounts.json` → `accounts`.

Current keys at this SHA:

| accountId | platform | enabled | mode |
|---|---|---|---|
| `music-tools-x` | `x` | `false` | `approval` |
| `example-x` | `x` | `false` | `pause` |
| `example-instagram` | `instagram` | `false` | `pause` |

History / metrics / strategy / experiments / feedback all key on field **`account`** (= that accountId).

Credential binding: `credentialKey` per account.

**No `workspace` concept** in code or config.

**No `creatorId`.** Only account-level `profile.identity` / `displayName` prose.

There is **no mapping table** from SNS-AI `accountId` to a My-SNS `workspaceId` / `SocialAccount.id`. Cross-product identity is blocked until an explicit external mapping is defined.

---

## 2. Performance scoring

Source of truth for Bridge Phase 3 parity: `src/analytics/scorer.mjs` (77 lines).

### 2.1 Platform weights (`DEFAULT_WEIGHTS`)

```js
x:         { exposure: 0.20, shareRate: 0.25, saveRate: 0.15, conversationRate: 0.10, profileRate: 0.15, clickRate: 0.15 }
instagram: { exposure: 0.20, shareRate: 0.25, saveRate: 0.20, conversationRate: 0.10, followRate: 0.10, watchQuality: 0.15 }
```

Unknown platform falls back to **X weights**.

Override: `account.objectives?.weights` merged over defaults in `scoreSnapshot`. Current `config/accounts.json` `defaults.objectives.weights` is `{}`.

X uses `profileRate` + `clickRate`. Instagram uses `followRate` + `watchQuality`. This asymmetry is current behavior and must be preserved in a parity port.

### 2.2 `metricVector(snapshot)`

Raw input: `snapshot.metrics`.

| Derived field | Formula |
|---|---|
| `exposure` | `Number(impressions \|\| reach \|\| views \|\| 0)` — first truthy among those three |
| `shareRate` | `(reposts + quotes + shares) / exposure` |
| `saveRate` | `(bookmarks + saved) / exposure` |
| `conversationRate` | `(replies + comments) / exposure` |
| `profileRate` | `(profileClicks + profileVisits) / exposure` |
| `clickRate` | `urlClicks / exposure` |
| `followRate` | `follows / exposure` |
| `watchQuality` | `max(playback100/videoViews, 1 - clamp(reelSkipRate, 0, 1))` |
| `safeRate` | `exposure > 0 ? value/exposure : 0` |

`likes` is collected by X/IG collectors but **not used** by `metricVector`. Canonical `RawMetricVector` also has no `likes`. Do not silently add it during the parity port.

### 2.3 Account-relative baseline (`baselineVector`)

Peer selection:

1. Prefer same `account` + `platform` + `checkpointMinutes`, excluding self `providerPostId`
2. Else fall back to same `account` + `platform` any checkpoint, excluding self
3. Per-key baseline = **median** of peer `metricVector`s
4. Empty peer set → median 0 (`count: 0`)

Baseline is **account-scoped**. No cross-account / workspace baseline exists.

### 2.4 `relativeScore(value, baseline)`

```text
if baseline <= 0: value > 0 ? 65 : 50
if value <= 0: 15
else: clamp(50 + 22 * log2(value / baseline), 0, 100)
```

### 2.5 `scoreSnapshot`

```text
component[key] = relativeScore(vector[key], baseline.vector[key] || 0)
score = Σ(component × weight) / Σ(weight)   // or 50 if no weights
score rounded to 1 decimal

baselineConfidence  = clamp(baselineCount / 10, 0, 1)
exposureConfidence  = clamp(log10(exposure + 1) / 4, 0, 1)
confidence = round( (0.7 * baselineConfidence + 0.3 * exposureConfidence) * 100 ) / 100
```

Return shape:

```js
{ score, confidence, vector, baseline, baselineCount, components }
```

This is the behavior Bridge scoring must match first. Do not “fix” it during the port.

---

## 3. Metrics storage and checkpoints

### 3.1 Store

| Item | Path |
|---|---|
| Append/read | `src/analytics/store.mjs` |
| File | `data/metrics.jsonl` |
| Collector | `src/analytics/collector.mjs` |
| Checkpoint math | `src/analytics/checkpoints.mjs` |
| X collector | `src/analytics/x-metrics.mjs` |
| IG collector | `src/analytics/instagram-metrics.mjs` |

`appendMetricSnapshot` writes:

```text
collectedAt (ISO, added at append)
account, platform, providerPostId, publishedAt
checkpointMinutes, actualAgeMinutes
metrics, warning?, unavailable?
```

`latestSnapshots` keeps the newest `collectedAt` per `(account, providerPostId)`.

Collector only implements **X and Instagram**. Other platforms are not collected here.

Collector requires `history.status === 'published'` and `providerPostId` and `at`. Max age: X default 30 days, Instagram default 14 (`analytics.maxAgeDays`).

### 3.2 Checkpoints

`DEFAULT_CHECKPOINTS = [60, 360, 1440, 4320, 10080]` minutes.

`config/accounts.json` `defaults.analytics.checkpointsMinutes` matches that.

Mature learning/experiments use **`checkpointMinutes >= 1440`** (24h), configurable via `account.learning.matureCheckpointMinutes`.

### 3.3 Raw metric producers

**X** (`normalizeX`):

`impressions, likes, reposts, replies, quotes, bookmarks, urlClicks, profileClicks, engagements, videoViews, playback25, playback50, playback75, playback100, privateMetricsAvailable`

Private metrics (`urlClicks`, `profileClicks`, playback, …) may be missing; collector then retries public-only and sets `warning`.

**Instagram**:

`views, reach, likes, comments, shares, saved, totalInteractions, follows, profileVisits, reelWatchTimeMs, reelAvgWatchTimeMs, reelSkipRate`

`reelSkipRate` is used by `watchQuality`. `reelWatchTimeMs` / `reelAvgWatchTimeMs` / `totalInteractions` / `likes` are **not** consumed by `metricVector`.

---

## 4. Strategy learning

### 4.1 Files

| Role | Path |
|---|---|
| Learn | `src/learning/learn.mjs` `buildStrategy` / `learnAll` |
| Features | `src/learning/features.mjs` |
| Store | `src/learning/store.mjs` → `data/strategies/<accountId>.json` |
| Ranking use | `src/lib/strategy-rank.mjs` |
| Schedule use | `src/lib/schedule.mjs` `learnedHourScore` |

### 4.2 Feature dimensions

```js
FEATURE_DIMENSIONS = ['topic', 'angle', 'hook', 'emotion', 'format', 'cta', 'mediaDecision', 'postingHour']
```

Where generated / stored / used:

| Stage | Path | What |
|---|---|---|
| Generated | `src/lib/openai.mjs` `CANDIDATE_SCHEMA` | AI must emit `topic, angle, hook, emotion, format, cta, mediaDecision, trendUsed` |
| Overwritten at media resolve | orchestrate (media path) | `draft.features.mediaDecision = media.decision` |
| Stored | `src/publish-core.mjs` → `data/history.jsonl` | `features`, `experiment`, `predictedScore`, `selectionMode` |
| Derived at learn | `historyFeatures` | adds `postingHour` from `entry.at` in account timezone; default `mediaDecision` from `mediaUrl` |
| Used in strategy | `learn.mjs` | group by dimension → lift |
| Used in ranking | `strategy-rank.mjs` | **omits `postingHour`** |
| Used in schedule | `schedule.mjs` | `postingHour` only |

AI schema includes `trendUsed` (boolean). That field is **not** in `FEATURE_DIMENSIONS`. `postingHour` is **not** AI-emitted; it is derived at learn time as `"HH:00"` via `Intl.DateTimeFormat` `hourCycle: 'h23'` in `account.schedule.timezone || account.timezone || 'Asia/Tokyo'`.

`mediaDecision` enum at generation: `'none' | 'library' | 'search' | 'generate'`.

### 4.3 `buildStrategy` constants (defaults from `config/accounts.json` `defaults.learning`)

| Constant | Default | Code |
|---|---|---|
| `strategyWindowDays` | **60** | `account.learning?.strategyWindowDays ?? 60` |
| `matureCheckpointMinutes` | **1440** | keep snapshots with `checkpointMinutes >= 1440` |
| `minSamplesPerPattern` | **2** | required before prefer/avoid ranking |
| `fullConfidencePosts` | **20** | strategy confidence denominator |
| `exploreRate` | **0.2** | copied onto strategy object |
| preferred cap | top **8** with `lift > 0` | |
| avoid cap | top **6** with `lift < 0` (worst first) | |
| per-pattern confidence | `clamp(n / 6, 0, 1)` | |
| strategy confidence | `clamp(sampleSize / fullConfidencePosts, 0, 1)` | |
| overallScore | mean of mature sample scores, or **50** | |
| lift | `mean(groupScores) - overall` | |

Window logic:

1. History rows in last `windowDays` with `providerPostId`
2. Snapshots for those posts
3. Keep **latest** snapshot per post
4. Require mature checkpoint
5. Score each with `scoreSnapshot(snapshot, windowSnapshots, weights)`
6. Attach `historyFeatures(post, timeZone)`

Empty evidence still returns a strategy object with `sampleSize: 0`, `overallScore: 50`, `confidence: 0`, empty preferred/avoid — **not** an `insufficient-evidence` status field. Bridge `GrowthStrategySnapshot.status` is new; do not silently invent it as current SNS-AI behavior.

### 4.4 Strategy JSON shape

Example: `data/strategies/example-x.json`

```text
account, generatedAt, strategyWindowDays, sampleSize, overallScore,
confidence, exploreRate, preferred[], avoid[], featureStats,
guardrail
```

Guardrail string (verbatim):

> Treat these as recent evidence, not identity. Never override profile, safety rules, or explicit human instructions.

Missing vs Bridge `GrowthStrategySnapshot`: `schemaVersion`, `strategyId`, `strategyVersion`, `creatorId`, `workspaceId`, `platform`, `sourceWindow.from/to`, `hardConstraintsDigest`, `inputsDigest`, `status`, `evidencePostIds`, `rationale`. Those are Bridge additions, not current SNS-AI fields.

`learn.mjs` does **not** read human feedback. Performance strategy and creator preference are separate stores.

### 4.5 Candidate ranking vs explore

`src/lib/strategy-rank.mjs`:

```text
exploit: predictedScore = ai*0.55 + learned*0.40 + novelty*0.05
explore: predictedScore = ai*0.45 + novelty*0.35 + learned*0.20
```

`learnedCandidateScore`: for each of 7 dims (no `postingHour`), if stat exists: `50 + (averageScore-50)*confidence`; mean or 50.

`shouldExplore(slotId, rate=0.2)`: FNV-ish hash of `slotId`; deterministic.

Adaptive schedule (`schedule.mjs`): if `adaptiveSchedule !== false` and `strategy.confidence >= adaptiveScheduleMinConfidence` (default **0.45**), pick from `adaptiveCandidateTimes` by `learnedHourScore = averageScore * (0.5 + 0.5*confidence)`.

---

## 5. Human feedback (creator preference, not performance)

### 5.1 Files

| Role | Path |
|---|---|
| Store | `src/feedback/store.mjs` |
| CLI | `src/feedback/record.mjs` |
| Data | `data/human-feedback.jsonl` |
| Workflow | `.github/workflows/feedback.yml` (`workflow_dispatch` only) |

### 5.2 Actions

`ACTIONS = {'prefer','avoid','correct','pin','note'}`. Default action `'note'`.

Row shape:

```js
{ at, account, action, note (≤4000), dimension?, value?, source, active }
```

`note` is required. `dimension` / `value` optional.

### 5.3 Pinned vs rolling window

`recentHumanFeedback(accountId, limit = 40)`:

- All `action === 'pin'` rows with `active !== false` **always included** (do not age out of the rolling window)
- Non-pin: last `humanFeedbackWindow` (default **40**)
- Deduped by `at|action|note|dimension|value`, newest first

### 5.4 Where it enters generation

1. Orchestrate loads `recentHumanFeedback` → passes to `generatePost` and `naturalizeDraft`
2. `src/lib/openai.mjs` `generationPrompt` puts `humanFeedback` in the user JSON **separately** from `learnedStrategy`
3. System prompt (verbatim intent):

> Explicit account identity/instructions and active human feedback outrank learned strategy. Learned strategy is only probabilistic evidence.
> Human feedback is ordered newest first. If human feedback conflicts, follow the newest applicable instruction; pinned instructions remain persistent unless a newer instruction explicitly supersedes them.
> Never let performance optimization override explicit human feedback, account identity, safety rules, or factual accuracy.

4. `naturalize.mjs` receives `newestHumanFeedback: humanFeedback.slice(0, 12)`

This is the same priority hierarchy the Bridge must preserve. Audience performance must not overwrite creator preference.

---

## 6. Experiments

| Piece | Path |
|---|---|
| Engine | `src/experiments/engine.mjs` |
| Store | `src/experiments/store.mjs` → `data/experiments/<safe(accountId)>.json` |
| Wired from learning | `learnAll` → `evaluateExperiment` then `ensureExperiment` |
| Assignment at gen | orchestrate → `assignmentForSlot(active, slot.slotId)` |

### 6.1 Defaults (`DEFAULT_VARIANTS`)

- `hook`: `['question','statement']`
- `format`: `['short','structured']`
- `cta`: `['none','soft']`
- `mediaDecision`: `['library','generate']`; for **x**: `['none','generate']`

Account defaults (`config/accounts.json` `defaults.experiments`):

- `enabled: true`
- dimensions: those four
- `minSamplesPerVariant: 3`
- `maxDays: 14`
- `minimumStrategySamples: 6`

### 6.2 Lifecycle

1. **`ensureExperiment`**: no active → require `strategy.sampleSize >= 6` → rotate dimension by `completedCount % dimensions.length` → id `{accountId}-{dim}-{YYYY-MM-DD}-{round+1}`
2. **`assignmentForSlot`**: `sha256(\`${id}:${slotId}\`).slice(0,8) % variants.length` → `{ id, dimension, variant, index }` only if `status === 'active'`
3. Generation forces `features[dimension] === variant` when possible; stored on history as `experiment`
4. **`evaluateExperiment`**: mature snapshots (`>= 1440`), matching `experiment.id` and `applied !== false`; mean score per variant
5. Complete when every variant has `n >= minSamplesPerVariant` **or** age ≥ `maxDays`
6. Winner = highest average when enough samples; else expire with `winner: null`
7. Confidence on completion: `enough ? min(1, round((min_n / max(3, minSamplesPerVariant*2)) * 100)/100) : 0`
8. Store keeps last **50** completed experiments (`completed.slice(-50)`); `completedCount` is retained

Bridge experiment contracts can be adapted from this engine. Runtime (JSON files, GitHub Actions, account enablement) must stay in SNS-AI.

SNS-AI statuses are `active` / `completed` / `expired`. Bridge contract currently uses `planned | running | completed | cancelled`. **Do not silently rename** during Phase 2 without documenting the mapping. `expired` vs `cancelled` / `inconclusive` is an adapter decision, not proven as identical.

---

## 7. Manual-only runtime invariants

**Do not change these.** This section records current facts only.

### 7.1 `config/runtime-policy.json` (exact)

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

### 7.2 CI/config audit (`src/ops/manual-only-audit.mjs`)

When Manual-Only is active:

1. The five runtime-policy flags above
2. No account may have `mode === 'auto'`
3. Any `enabled === true` account must have `mode === 'approval'`
4. Engagement: `enabled === false`, `autoReply === false`, `autoDmReply === false`, `approvalRequired === true`
5. `engagement.liveAccounts` must be `[]`
6. Every operational workflow trigger = **only** `workflow_dispatch`
7. Infra: `ci.yml` = push/PR/workflow_dispatch; `failure-watch.yml` = workflow_run only; those must not receive SNS secrets / `contents:write`

Operational workflow set (exact): `account-control`, `autopilot`, `chatops`, `compliance-attestation`, `engagement-control`, `engagement-resolve`, `engagement-scheduled`, `engagement`, `feedback`, `health`, `hub-reconcile`, `intelligence`, `learning`, `maintenance`, `metrics`, `policy`, `preflight`, `publish-reconcile`, `publish`.

At this SHA, operational workflows have **no `schedule:` / `cron:`**. Example: `.github/workflows/metrics.yml` is `workflow_dispatch` only, with comment “Manual-only safety posture: no scheduled provider reads.”

### 7.3 Runtime enforcement (`src/ops/manual-only.mjs`)

| Guard | Behavior |
|---|---|
| `assertLifecycleTransitionAllowed` | Blocks transitions to `approval`/`auto` while `manualOnly`; after lift, still blocks unless `allowAutomaticAccountActivation === true` |
| `assertEngagementActivationAllowed` | Blocks activating engagement while `manualOnly`; after lift needs `allowAutomaticEngagement` |
| `assertAutomaticEngagementAllowed` | Dry-run allowed; after Manual-Only lift, live engagement needs `allowAutomaticEngagement` |
| `assertProviderMutationAllowed` | If `manualOnly` and not dry-run: requires `SNS_MANUAL_INVOCATION === 'true'` **unconditionally** |
| `isExplicitManualInvocation` | `process.env.SNS_MANUAL_INVOCATION === 'true'` |

Used by publish-core, engagement providers, account-control, engagement activate.

### 7.4 Current config state (this commit)

| Item | Value |
|---|---|
| All accounts `enabled` | **false** |
| `music-tools-x.mode` | `approval` (disabled) |
| example accounts mode | `pause` |
| `engagement-policy.enabled` | **false** |
| `liveAccounts` | **[]** |
| `autoReply` / `autoDmReply` | **false** |
| `approvalRequired` | **true** |
| Operational workflows | **no active cron** |

Docs: `docs/MANUAL_ONLY_MODE.md`. Tests: `test/manual-only-posture.test.mjs`, `test/manual-only-policy.test.mjs`.

Bridge adapters/tests must not mutate these files or restore schedules.

---

## 8. History / published-post shape (SNS-AI)

`data/history.jsonl` via `src/lib/history.mjs`.

Successful publish bookkeeping (`src/publish-core.mjs`) includes at least:

```text
at, account, platform, status: 'published', source, slotId,
text, textHash, mediaUrl, mediaType, mediaAltText, commercial,
providerPostId, features, experiment, predictedScore, ...
```

Durable claims reconcile before a second provider call. This is SNS-AI runtime, not Bridge ownership.

For `PublishedPostSnapshot` from SNS-AI: require `status === 'published'` and `providerPostId`. Do not treat dry-run, approval-pending, or `publish_unknown` as published without SNS-AI itself reconciling to published.

---

## 9. Stale docs vs current code

`docs/MANUAL_ONLY_MODE.md` matches current `runtime-policy.json`, disabled accounts, empty `liveAccounts`, and `workflow_dispatch`-only operational workflows.

Scoring/learning docs in Bridge (`docs/ARCHITECTURE.md`, `docs/CONTRACTS.md`) describe the intended port of this scorer/learner. Current SNS-AI strategy JSON lacks Bridge provenance fields (`strategyId`, `inputsDigest`, `status: insufficient-evidence`, evidence post IDs, rationale). Those are **additions**, not current SNS-AI fields.

`PROMPT_VERSION = 'sns-ai-2026-08-v3'` in `src/lib/openai.mjs`.

---

## 10. Open questions / blockers (SNS-AI)

1. **No workspace / creator identity.** Only `accountId` strings.
2. **No cross-repo join** to My-SNS `Workspace` / `SocialAccount`.
3. **Scoring platforms are X and Instagram only.** YouTube/TikTok/Threads/Facebook/note/website weights are not defined; unknown platforms currently inherit X weights — preserve that as current behavior, do not treat it as a designed YouTube scorer.
4. **`trendUsed` is generated but not a learning dimension.** `postingHour` is learned but not ranked.
5. **Strategy object has no `insufficient-evidence` status.** Empty strategies still look like active JSON with zeros.
6. **Experiment status vocabulary differs** from Bridge (`expired` vs `cancelled` / `inconclusive`).
7. **Human feedback `account` is SNS-AI accountId**, not My-SNS workspace.
8. **Manual-only must remain untouched.** Adapter tests must prove non-mutation.

---

## 11. Source file index

| Topic | Path |
|---|---|
| Scorer | `src/analytics/scorer.mjs` |
| Checkpoints | `src/analytics/checkpoints.mjs` |
| Collector | `src/analytics/collector.mjs` |
| Metrics store | `src/analytics/store.mjs` |
| X metrics | `src/analytics/x-metrics.mjs` |
| IG metrics | `src/analytics/instagram-metrics.mjs` |
| Learn | `src/learning/learn.mjs` |
| Features | `src/learning/features.mjs` |
| Strategy store | `src/learning/store.mjs` |
| Ranking | `src/lib/strategy-rank.mjs` |
| Generation prompt | `src/lib/openai.mjs` |
| History | `src/lib/history.mjs` |
| Publish core | `src/publish-core.mjs` |
| Human feedback | `src/feedback/store.mjs` |
| Experiments | `src/experiments/engine.mjs`, `src/experiments/store.mjs` |
| Runtime policy | `config/runtime-policy.json` |
| Accounts | `config/accounts.json` |
| Engagement policy | `config/engagement-policy.json` |
| Manual-only runtime | `src/ops/manual-only.mjs` |
| Manual-only audit | `src/ops/manual-only-audit.mjs` |
| Manual-only docs | `docs/MANUAL_ONLY_MODE.md` |
| Example strategy | `data/strategies/example-x.json` |
