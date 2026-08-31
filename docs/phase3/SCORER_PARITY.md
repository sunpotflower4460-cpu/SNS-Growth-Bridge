# Phase 3 — Scorer parity

Bridge scoring behavior version: `sns-ai-parity-v1`  
Contract schema major: `1` (separate)

## Implementation files

- `packages/scoring/src/metric-vector.ts`
- `packages/scoring/src/median.ts`
- `packages/scoring/src/baseline.ts`
- `packages/scoring/src/relative-score.ts`
- `packages/scoring/src/weights.ts`
- `packages/scoring/src/score-snapshot.ts`
- Frozen reference: `packages/scoring/fixtures/reference/sns-ai-scorer.mjs`

Canonical types (`MetricSnapshot`, `RawMetricVector`, `NormalizedMetricVector`, `PerformanceScore`, `Platform`, `GrowthSubjectRef`) are imported from `@sns-growth-bridge/contracts`. They are not redefined.

## Identity

Account-relative baseline uses **only** `subject.accountId`. `workspaceId` / `creatorId` are not substitutes. Missing `accountId` throws `ScoringInputError`.

Self-exclusion uses `externalPostId` (SNS-AI `providerPostId`).

## Golden fixtures

Generated from the frozen SNS-AI scorer (not from the TypeScript port):

- `x-empty-baseline.json`
- `x-normal.json`
- `x-high-performance.json`
- `x-low-performance.json`
- `instagram-normal.json`
- `instagram-watch-quality.json`
- `same-checkpoint-baseline.json`
- `fallback-checkpoint-baseline.json`
- `likes-ignored.json`
- `reach-fallback.json`
- `views-fallback.json`
- `exposure-zero.json`
- `youtube-x-weight-fallback.json`
- `weight-override.json`
- `zero-weight-total.json`

Regenerate with `node packages/scoring/scripts/generate-golden.mjs`.

## Parity cases

Covered: metric vector (X/IG, exposure fallbacks, likes ignored, aggregations, watchQuality both paths), baseline (same checkpoint, fallback, other account/platform/self excluded, empty, median odd/even), relativeScore edges, X/IG weights, override, zero-weight total → 50, 1-decimal rounding, confidence.

Canonical parsers reject unknown platform strings. Scoring internals still apply X-weight fallback for enum platforms without dedicated weights (`youtube`, `tiktok`, …). That matches SNS-AI `DEFAULT_WEIGHTS[platform] || DEFAULT_WEIGHTS.x`.

## Exact-match status

Golden fixtures compared with `toEqual` against `scoreSnapshot`. Target: **15/15 exact**.

## Intentional non-changes

- formula, weights, median, relativeScore, confidence, rounding
- likes ignored
- unknown-platform X fallback
- no strategy learning, adapters, CreatorAction, Anchor/Orbit runtime

## Future improvement candidates

See `docs/phase3/FUTURE_SCORING_IMPROVEMENTS.md`. Not implemented in Phase 3.
