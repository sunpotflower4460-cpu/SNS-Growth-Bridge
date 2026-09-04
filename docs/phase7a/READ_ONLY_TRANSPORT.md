# Phase 7A — Read-only evidence transport

## Source JSONL

SNS-AI (unchanged paths at `914c70ee`):

- `data/history.jsonl`
- `data/metrics.jsonl`
- `data/human-feedback.jsonl`

Bridge never discovers these by walking the filesystem. Caller passes:

```ts
{ historyPath, metricsPath, feedbackPath }
```

plus `accountId`, `platform`, `sourceCommitSha`, `loadedAt`, `traceId`.

## Read-only I/O

Allowed: `stat`, `readFile`, parse, validate, adapt, filter, sort.

Forbidden: append, truncate, rename, delete, rewrite, chmod, network, My-SNS Supabase, implicit `process.cwd()` search.

## File / row limits

Defaults: 2 MiB per file, 5_000 object rows per file. Excess fails closed.

`maxBytesPerFile` and `maxRowsPerFile` overrides (and the resolved defaults) must be finite positive integers at the transport/I/O boundary. `NaN`, `Infinity`, `-Infinity`, `0`, negatives, and non-integers fail closed **before** `size > maxBytes` / `rows.length > maxRows`, which would otherwise treat those values as “never exceeded”.

`loadedAt` must be a non-empty ISO 8601 datetime with offset (including `Z`). Invalid timestamps fail closed even when JSONL evidence is empty.

## JSONL rules

- Blank / whitespace-only lines skipped
- Malformed JSON fails closed (not treated as empty)
- Non-object JSON fails closed
- Missing file fails closed

## Canonical adapter reuse

Rows are converted only through Phase 6:

- `adaptSnsAiHistoryToPublishedPost`
- `adaptSnsAiMetricSnapshot`
- `adaptSnsAiHumanFeedback`
- `adaptSnsAiHistoryToStrategyPostEvidence`

## Evidence bundle

`SnsAiEvidenceBundle` contains Canonical arrays, account/platform, source repository + caller SHA, `loadedAt`, counts, and a SHA-256 `digest`. Absolute paths are not included.

Ordering:

- PublishedPost: `publishedAt`, `postId`
- Metric: `capturedAt`, `snapshotId`
- Feedback: `occurredAt`, `eventId`
- Strategy posts: `publishedAt`, `externalPostId`

Digest is SHA-256 of a key-sorted JSON serialization of those Canonical fields (no local paths).

Account filtering: only `row.account === accountId`. Other accounts never enter scoring/strategy. Target-account platform mismatch fails closed.
