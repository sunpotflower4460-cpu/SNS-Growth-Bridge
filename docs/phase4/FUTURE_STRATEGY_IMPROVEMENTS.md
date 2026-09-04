# Future strategy improvements

Recorded during Phase 4. **Not implemented.** Changing any of these would require a new strategy-behavior version (`sns-ai-learn-parity-v1` → something else), not a silent edit of the parity core.

## Latest-then-mature filtering

- **Idea:** Prefer the newest *mature* snapshot, or keep a prior mature snapshot when a later collection is still immature.
- **Current behavior:** Newest `capturedAt` / `collectedAt` is chosen first; then `checkpointMinutes >= 1440` is applied. A later 360-minute snapshot can drop a post that already had a 1440-minute snapshot.
- **Possible benefit:** Less surprising sample loss.
- **Risk:** Breaks SNS-AI `buildStrategy()` parity.
- **Would require strategy version bump?:** YES

## Confidence-weighted pattern means

- **Idea:** Weight sample scores by Phase 3 scorer `confidence`, exposure, or recency.
- **Current behavior:** Simple mean of scores. Low-confidence scores count as one sample.
- **Possible benefit:** Down-weight tiny / young posts.
- **Risk:** Changes every lift and preferred/avoid list.
- **Would require strategy version bump?:** YES

## Bayesian shrinkage / sample-size smoothing

- **Idea:** Shrink pattern averages toward overall when n is small.
- **Current behavior:** n=1 is stored in `featureStats` but excluded from rank (`minSamplesPerPattern` default 2). No shrinkage.
- **Possible benefit:** Fewer noisy n=2 promotions into preferred.
- **Risk:** Changes ranking vs SNS-AI.
- **Would require strategy version bump?:** YES

## Feature confidence denominator

- **Idea:** Use `fullConfidencePosts` (20) or a Wilson interval instead of `n / 6`.
- **Current behavior:** Pattern confidence is `clamp(n / 6, 0, 1)`. Strategy confidence separately uses `sampleSize / 20`.
- **Possible benefit:** One consistent confidence scale.
- **Risk:** Downstream prompts treat 0.33 (n=2) as current meaning.
- **Would require strategy version bump?:** YES

## Human feedback in lift

- **Idea:** Mix `prefer` / `avoid` / `pin` into feature ranking.
- **Current behavior:** `buildStrategy()` does not read human feedback. Creator preference and audience performance stay separate.
- **Possible benefit:** Explicit creator rules appear in the same object.
- **Risk:** Promotes performance strategy toward identity; violates the priority hierarchy.
- **Would require strategy version bump?:** YES (and likely a different contract)

## Experiments inside strategy build

- **Idea:** Fold `ensureExperiment` / `evaluateExperiment` into strategy output.
- **Current behavior:** `learnAll()` calls them after `buildStrategy()`. Phase 4 ports `buildStrategy()` only.
- **Possible benefit:** One artifact for learning + experiment state.
- **Risk:** Couples a later experiment phase into parity core.
- **Would require strategy version bump?:** YES — this is a later phase, not a silent add-on

## Artist Support V2 / Anchor / Orbit / Creator Action

- **Idea:** Emit `CreatorActionRecommendation`, `HumanAnchorEvent`, `OrbitPlan`, asset-demand signals, or funnel-repair actions from strategy build.
- **Current behavior:** Not generated. SNS-AI `src/artist/*` and `src/growth/*` exist on current `main` but do not replace `buildStrategy()`.
- **Possible benefit:** Shared creator-support brain.
- **Risk:** Phase 4 would mix new product logic into performance parity.
- **Would require strategy version bump?:** YES — future phase

## Multi-objective / multi-brand / budget / explore modules

- **Idea:** Consume SNS-AI growth objectives, budget governor, explore modules, or multi-brand mix as strategy inputs.
- **Current behavior:** Source-neutral `StrategyLearningConfig` only (window, mature checkpoint, minSamples, fullConfidencePosts, exploreRate, timezone, score weights).
- **Possible benefit:** Richer operator controls.
- **Risk:** Imports SNS-AI account-config shape into the Bridge package.
- **Would require strategy version bump?:** YES

## Canonical mediaUrl mapping

- **Idea:** Derive `hasLegacyMediaUrl` from Canonical `PublishedPostSnapshot.media`.
- **Current behavior:** Phase 4 uses internal `StrategyPostEvidence`. Canonical posts have no `mediaUrl`. Mapping is not frozen here.
- **Possible benefit:** Adapter can feed Canonical posts into strategy.
- **Risk:** Guessing `media[]` → `library`/`none` without an audit is forbidden.
- **Would require adapter phase (Phase 5+), not a parity-core change**
