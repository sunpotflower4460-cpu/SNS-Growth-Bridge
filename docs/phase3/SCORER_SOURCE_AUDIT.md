# Phase 3 — Scorer source audit

Status: **parity target unchanged**

## Audited SHA

- Repository: `sunpotflower4460-cpu/SNS-AI`
- Audit / current `main` SHA: `3bd90cc8ac80da84df949799dd4b8be2dc109767`
- `src/analytics/scorer.mjs` blob: `9dc00053858bbf4ed0b7bf2b45e75b137541d8b5`

Current SNS-AI `main` is the same commit as the Phase 0 audit SHA. Scorer semantics have **not** changed. Phase 3 parity target remains the audit SHA.

## Source files

- `src/analytics/scorer.mjs` — scoring formulas (source of truth)
- `src/analytics/store.mjs` — JSONL persistence only; not ported
- `config/accounts.json` — `defaults.objectives.weights` is `{}`; per-account scoring weight overrides are not present on audited accounts

## Formulas (copied, not improved)

### Exposure (first truthy, not max)

```js
Number(m.impressions || m.reach || m.views || 0)
```

JS `||` treats `0` as missing, so `impressions: 0` falls through to `reach`.

### Rates

`safeRate(value, exposure) = exposure > 0 ? Number(value || 0) / exposure : 0`

- share = reposts + quotes + shares
- saves = bookmarks + saved
- conversation = replies + comments
- profile = profileClicks + profileVisits
- clicks = urlClicks
- follows = follows

### watchQuality

```js
completion = videoViews > 0 ? playback100 / (videoViews || 1) : 0
skipQuality = reelSkipRate != null ? 1 - clamp(reelSkipRate, 0, 1) : 0
watchQuality = Math.max(completion, skipQuality)
```

### likes

Collected by SNS-AI collectors. **Not read** by `metricVector`.

## Platform weights

X: exposure 0.20, shareRate 0.25, saveRate 0.15, conversationRate 0.10, profileRate 0.15, clickRate 0.15

Instagram: exposure 0.20, shareRate 0.25, saveRate 0.20, conversationRate 0.10, followRate 0.10, watchQuality 0.15

Unknown platform: `DEFAULT_WEIGHTS[platform] || DEFAULT_WEIGHTS.x`

Account override: `{ ...defaults, ...(configuredWeights || {}) }`. Weights `<= 0` or non-finite are skipped. If no positive weights remain, score is `50`.

## Baseline

1. same `account` + `platform` + `checkpointMinutes`, different `providerPostId`
2. else same `account` + `platform`, different `providerPostId`

Median per vector key. Empty peers → all baseline keys `0`, `count` `0`.

Bridge maps `account` → `subject.accountId` and `providerPostId` → `externalPostId`. Missing `accountId` fails closed.

## relativeScore

```text
baseline <= 0 → value > 0 ? 65 : 50
value <= 0 → 15
else clamp(50 + 22 * log2(value / baseline), 0, 100)
```

## Rounding

- score: `Math.round(score * 10) / 10` (1 decimal)
- confidence: `Math.round((0.7 * clamp(n/10,0,1) + 0.3 * clamp(log10(exposure+1)/4,0,1)) * 100) / 100`

## Identified quirks (preserved)

- first-truthy exposure, including `0` skip
- unknown platform inherits X weights
- Instagram vs X asymmetric keys
- likes unused
- self exclusion is provider/external post id, not internal post id

## Parity target change?

**NO.** SNS-AI `main` matches `3bd90cc8ac80da84df949799dd4b8be2dc109767`.
