# Phase 4 — Strategy source audit

Status: **parity target confirmed unchanged**

## Audited SHAs

| Item | Value |
|---|---|
| SNS-Growth-Bridge base `main` | `d4989f38e962274a92cf9b96957ee3805948cbdf` |
| SNS-AI current `main` (audited) | `914c70ee4666015f93603eef9a2f3dd9a1a7de08` |
| Strategy parity target SHA | `914c70ee4666015f93603eef9a2f3dd9a1a7de08` |
| Phase 0 / Phase 3 reference SHA | `3bd90cc8ac80da84df949799dd4b8be2dc109767` |

## Blob SHAs (current main, self-verified)

| File | Blob SHA | Matches task-provided value? |
|---|---|---|
| `src/learning/learn.mjs` | `9ffae3058c70c873757a87522387c2d62e89e8e9` | Yes — matches the SHA named in the Phase 4 instructions |
| `src/learning/features.mjs` | `aeaaf99fb81511f9cb6ae02578700c103d19589d` | n/a (not pre-supplied); confirmed identical to Phase 0 SHA (see below) |
| `src/analytics/store.mjs` | `9075598f8c7507c08bea5b77e42cc33078996afa` | n/a; confirmed identical to Phase 0 SHA (see below) |
| `src/analytics/scorer.mjs` | `9dc00053858bbf4ed0b7bf2b45e75b137541d8b5` | Matches Phase 3 audit (`docs/phase3/SCORER_SOURCE_AUDIT.md`) |
| `config/accounts.json` | `dd5460c5281fc3d7daadaea3f8657e3418458d02` | Changed since Phase 0 (see below) — `defaults.learning` block unchanged |

Verified by cloning `sunpotflower4460-cpu/sns-ai` at `914c70ee4666015f93603eef9a2f3dd9a1a7de08` and running `git hash-object` directly against the four files.

## Diff against Phase 0 / Phase 3 reference SHA (`3bd90cc8ac80da84df949799dd4b8be2dc109767`)

Ran `git diff 3bd90cc8ac80da84df949799dd4b8be2dc109767 914c70ee4666015f93603eef9a2f3dd9a1a7de08 -- src/learning/learn.mjs src/learning/features.mjs src/analytics/store.mjs src/analytics/scorer.mjs config/accounts.json`.

Result:

- `src/learning/learn.mjs` — **no diff** (byte-identical; same blob SHA as the audit SHA).
- `src/learning/features.mjs` — **no diff** (byte-identical).
- `src/analytics/store.mjs` — **no diff** (byte-identical).
- `src/analytics/scorer.mjs` — **no diff** (byte-identical; matches Phase 3 audit).
- `config/accounts.json` — **diff present**, but confined to:
  - new account entries (`plugin-radar-instagram`, `artist-x`, `artist-instagram`, `brand-c-x`, `brand-c-instagram`) and cosmetic renames (`music-tools-x.displayName`, added `brandId`/`contentStrategy`)
  - a new `defaults.artist` block (Artist Support V2 configuration)
  - `defaults.learning` (the block Phase 4 parity depends on) is **byte-identical**: `exploreRate: 0.2`, `matureCheckpointMinutes: 1440`, `strategyWindowDays: 60`, `minSamplesPerPattern: 2`, `fullConfidencePosts: 20`, `humanFeedbackWindow: 40`, `adaptiveSchedule: true`, `adaptiveScheduleMinConfidence: 0.45`, `adaptiveScheduleKeepAtLeast: 1`.

## New SNS-AI Growth OS modules (not part of this phase)

At `914c70ee4666015f93603eef9a2f3dd9a1a7de08`, SNS-AI additionally has:

- `src/artist/*` — `actions.mjs`, `anchor.mjs`, `assets.mjs`, `bridge-contracts.mjs`, `campaign.mjs`, `evidence.mjs`, `fatigue.mjs`, `funnel-repair.mjs`, `ingest.mjs`, `mix.mjs`, `orbit.mjs`, `overlap.mjs`, `plan.mjs`, `provenance.mjs`
- `src/growth/*` — `explore.mjs`, `metrics.mjs`, `objectives.mjs`

Confirmed by `grep -rl "buildStrategy" src`: the **only** file referencing `buildStrategy` is `src/learning/learn.mjs` itself. None of the new `src/artist/*` or `src/growth/*` modules call, wrap, or replace `buildStrategy()`. `learnAll()` still calls `buildStrategy()` directly and then (separately) `evaluateExperiment()` / `ensureExperiment()` — those two experiment calls are explicitly out of scope for Phase 4 (see item 27 of the Phase 4 instructions) and are not ported here.

## Strategy Learning semantics changed since Phase 0?

**NO.**

`buildStrategy()`, `historyFeatures()`, `FEATURE_DIMENSIONS`, `latestSnapshots()`, and the `defaults.learning` configuration block are byte-identical between the Phase 0/3 reference SHA and the current SNS-AI `main` audited for this phase. The only relevant change to `config/accounts.json` is additive (new accounts, new `defaults.artist` block) and does not touch `defaults.learning` or any field `buildStrategy()` reads.

No stop condition was triggered: SNS-AI `main` did not move again mid-task, and `learn.mjs` / `features.mjs` / `latestSnapshots` semantics were not changed relative to either reference point.

## Source files ported in this phase

| Role | Path | Port target |
|---|---|---|
| Strategy build | `src/learning/learn.mjs` `buildStrategy()` | `packages/strategy/src/build-strategy.ts` |
| Feature derivation | `src/learning/features.mjs` `historyFeatures()`, `FEATURE_DIMENSIONS` | `packages/strategy/src/history-features.ts`, `types.ts` |
| Latest snapshot selection | `src/analytics/store.mjs` `latestSnapshots()` | `packages/strategy/src/latest-snapshots.ts` |
| Scoring | `src/analytics/scorer.mjs` `scoreSnapshot()` | reused unmodified from `@sns-growth-bridge/scoring` (Phase 3); **not** re-implemented |

## Explicitly not ported in this phase

Per the Phase 4 instructions, the following current SNS-AI features are **not** mixed into the strategy parity core, even though they exist on `main`:

- `src/artist/*` (Artist Support V2, Human Anchor / Orbit, Creator Action, campaign/funnel/fatigue logic)
- `src/growth/*` (growth objectives, explore modules)
- `learnAll()`'s `ensureExperiment()` / `evaluateExperiment()` calls (experiment lifecycle)
- multi-brand / budget-governor logic in `config/accounts.json` defaults added since Phase 0

These are recorded as future integration candidates in `docs/phase4/FUTURE_STRATEGY_IMPROVEMENTS.md`, not implemented here.
