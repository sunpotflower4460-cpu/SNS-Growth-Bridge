# Phase 4 — Future strategy improvement candidates

Status: **not implemented**. Recorded per the Phase 4 instructions so identified issues and adjacent SNS-AI capabilities are not lost, without changing Parity Core behavior now.

Phase 4's rule is parity, not improvement: `buildStrategyParity()` must equal SNS-AI `buildStrategy()` exactly. Everything below is a candidate for a **future, explicitly-approved** phase.

## Scoring / weighting quirks worth reconsidering

- **Latest-before-mature ordering.** A post's newest-collected snapshot is selected before the mature-checkpoint filter runs. If a fresh, immature re-check overwrites an older mature checkpoint as "latest", the post silently drops out of learning even though a perfectly usable mature snapshot exists for it. A future version could select the newest *mature* snapshot instead. Not changed in Phase 4 — see `latest-immature-drops-mature-history` in `docs/phase4/STRATEGY_PARITY.md`.
- **Equal-weight sample averaging.** `buildStrategy()` uses a plain arithmetic mean of `score` per feature group; the Phase 3 scorer's own `confidence` (`StrategySample.scoreConfidence`) is computed but never used to weight the average or lift. A confidence-weighted mean, exposure weighting, recency weighting, or Bayesian shrinkage toward the account baseline as `n` grows could produce steadier preferred/avoid lists, especially near the `minSamplesPerPattern` boundary. Not implemented — explicitly forbidden for Phase 4 parity.
- **Fixed feature-confidence denominator (`6`).** Independent of `fullConfidencePosts`; a future version might unify these or make the feature-level denominator configurable.
- **`exploreRate` is not clamped at Parity Core.** A caller could pass `exploreRate: 5` and Parity Core would copy it through unchanged (matching SNS-AI); only the canonical projection's `0..1` schema bound would ever catch it. A future version could validate `StrategyLearningConfig` inputs directly.

## SNS-AI capabilities not mixed into Parity Core

Present in SNS-AI `main` (`914c70ee4666015f93603eef9a2f3dd9a1a7de08`) but explicitly out of scope for Phase 4, confirmed by `docs/phase4/STRATEGY_SOURCE_AUDIT.md` to not currently wrap or replace `buildStrategy()`:

- **Experiments** (`ensureExperiment` / `evaluateExperiment`, `src/experiments/*`) — separate lifecycle with its own store, variant assignment, and completion rules. A future phase could port this alongside or on top of Parity Core strategy output.
- **Artist Support V2** (`src/artist/*`: `actions.mjs`, `anchor.mjs`, `assets.mjs`, `bridge-contracts.mjs`, `campaign.mjs`, `evidence.mjs`, `fatigue.mjs`, `funnel-repair.mjs`, `ingest.mjs`, `mix.mjs`, `orbit.mjs`, `overlap.mjs`, `plan.mjs`, `provenance.mjs`).
- **Growth objectives / explore modules** (`src/growth/*`: `explore.mjs`, `metrics.mjs`, `objectives.mjs`).
- **Human Anchor / Orbit** and **Creator Action generation** — canonical contracts already exist (`docs/CONTRACTS.md` §15-16) but Phase 4 does not generate them from strategy evidence.
- **Funnel repair, fatigue detection, campaign planning, new-artist mix, budget governor, multi-brand logic** — all present in current SNS-AI config/`src/artist`/`src/growth` but not read by `buildStrategy()` and not ported here.

## Adapter work deferred to a later phase

- SNS-AI `data/history.jsonl` -> `StrategyPostEvidence` adapter (including the real `mediaUrl` -> `hasLegacyMediaUrl` mapping).
- SNS-AI `data/metrics.jsonl` -> `MetricSnapshot` adapter reuse for strategy input (Phase 3 already covers scoring parity; a strategy-facing loader is still needed).
- Canonical `PublishedPostSnapshot` -> `StrategyPostEvidence` adapter. Canonical snapshots have no `mediaUrl`; deciding how `media[]` (`type`/`role`) maps to `hasLegacyMediaUrl` (or whether `mediaDecision` should instead be derived from canonical `features.mediaDecision` only) is an explicit Phase 5+ decision, not made in Phase 4.
- `strategyId` / `inputsDigest` generation. Phase 4 requires these as caller-supplied inputs to `projectToGrowthStrategySnapshot`. A future phase could add a canonical, order-stable, timestamp-independent digest function over the evidence set (explicitly avoiding array/key-order instability and avoiding random UUIDs, per the Phase 4 instructions).

## My-SNS integration

Not connected in Phase 4: My-SNS Draft, Brand Profile, Revision, Metric, and Publish flows remain untouched. My-SNS has no durable `MetricSnapshot` source yet (see `docs/CONTRACTS.md` §9), so audience-performance strategy learning cannot start from My-SNS data until that exists.
