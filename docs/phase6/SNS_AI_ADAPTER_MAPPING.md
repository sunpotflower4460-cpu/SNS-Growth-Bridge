# Phase 6 — SNS-AI adapter mapping

Pure DTO → Canonical. No JSONL I/O. Source SHA: `914c70ee4666015f93603eef9a2f3dd9a1a7de08`.

Historical Phase 0 matrix: `docs/audit/MAPPING_MATRIX.md` (not rewritten).

Mapping values: `direct` / `deterministically_derived` / `optional_unavailable` / `blocked`.

## Envelope

| Canonical field | SNS-AI source | Mapping | Confidence | Loss / unavailable |
|---|---|---|---|---|
| `meta.schemaVersion` | adapter stamps `1` | deterministically_derived | high | |
| `meta.producer` | `'sns-ai'` | deterministically_derived | high | |
| `meta.producedAt` | `SnsAiAdapterContext.producedAt` | direct | high | no implicit clock |
| `meta.traceId` | `SnsAiAdapterContext.traceId` | direct | high | no random UUID |

## Identity

| Canonical field | SNS-AI source | Mapping | Confidence | Loss / unavailable |
|---|---|---|---|---|
| `subject.accountId` | `account` (trim, non-empty) | direct | high | adapter-boundary fail closed |
| `subject.creatorId` | none | blocked | n/a | never invent |
| `subject.workspaceId` | none | blocked | n/a | never invent; no My-SNS map |

## History → PublishedPostSnapshot

Public API: `adaptSnsAiHistoryToPublishedPost({ row, platform? }, context)`.

Emit only when `status === 'published'` and `providerPostId` is non-empty (collector publication truth).

| Canonical field | SNS-AI source | Mapping | Confidence | Loss / unavailable |
|---|---|---|---|---|
| `postId` | `sns-ai:<account>:<providerPostId>` | deterministically_derived | high | empty components blocked / skipped first |
| `platform` | `row.platform` or caller `platform` | direct | high | never inferred from accountId; mismatch blocked |
| `externalPostId` | `providerPostId` | direct | high | required for SNS-AI; missing → not-applicable |
| `publishedAt` | `at` | direct | high | invalid ISO → blocked |
| `text` | `text` | direct | high | optional; not invented |
| `features` | known dimensions only | direct | high | unknown keys stripped (`trendUsed`, …) |
| `media` | none proven Canonical type | optional_unavailable | high | always `[]`; URL never copied |
| `revisionId` / `seedId` | none | optional_unavailable | high | omitted |
| `experimentAssignment` | history `experiment` is SNS-AI-local | optional_unavailable | high | omitted |

## Metrics → MetricSnapshot

Public API: `adaptSnsAiMetricSnapshot({ row, platform? }, context)`.

| Canonical field | SNS-AI source | Mapping | Confidence | Loss / unavailable |
|---|---|---|---|---|
| `snapshotId` | `sns-ai:metric:<account>:<providerPostId>:<checkpointMinutes>:<collectedAt>` | deterministically_derived | high | all parts validated first |
| `postId` | `sns-ai:<account>:<providerPostId>` | deterministically_derived | high | same as PublishedPost |
| `externalPostId` | `providerPostId` | direct | high | empty → blocked |
| `capturedAt` | `collectedAt` | direct | high | invalid ISO → blocked |
| `checkpointMinutes` | `checkpointMinutes` | direct | high | Canonical `positiveInt` only; not limited to 60/360/1440/4320/10080 |
| `metrics.likes` | `likes` | direct | high | preserved; not scored |
| `metrics.*` | overlapping Canonical keys | direct | high | see unavailable list |
| `engagements` / `playback25/50/75` / `totalInteractions` / `reelWatchTimeMs` / `reelAvgWatchTimeMs` | source-only | optional_unavailable | high | **currently not represented** on Canonical RawMetricVector |
| `warning` / `unavailable` / `actualAgeMinutes` / `publishedAt` | source-only | optional_unavailable | high | not Canonical MetricSnapshot fields |

Adapter does not compute shareRate / exposure / performance score.

## Human feedback → ExplicitFeedbackEvent

Public API: `adaptSnsAiHumanFeedback(row, context)`.

| Canonical field | SNS-AI source | Mapping | Confidence | Loss / unavailable |
|---|---|---|---|---|
| `eventId` | `sns-ai:feedback:<sha256(account,at,action,note,dimension,value,active)>` | deterministically_derived | high | Node crypto; no secrets hashed |
| `action` | `prefer/avoid/correct/pin/note` | direct | high | unknown action blocked; pin is not rewritten to prefer |
| `note` | `note` trim | direct | high | empty → blocked |
| `dimension` | Canonical dimensions only | direct | high | unknown non-empty → blocked |
| `value` | `value` | direct | high | null / whitespace → omitted |
| `active` | `active !== false` | direct | high | `false` preserved |
| `occurredAt` | `at` | direct | high | invalid ISO → blocked |
| `source` | SNS-AI `source` | optional_unavailable | high | **currently not represented** |

`action: correct` → ExplicitFeedbackEvent. It is not `HumanCorrectionEvent`.

## History → Phase 4 StrategyPostEvidence

Public API: `adaptSnsAiHistoryToStrategyPostEvidence({ row, accountId? })`.

| Phase 4 field | SNS-AI source | Mapping | Confidence | Loss / unavailable |
|---|---|---|---|---|
| `accountId` | `account` | direct | high | caller `accountId` mismatch → blocked |
| `externalPostId` | `providerPostId` | direct | high | missing → not-applicable |
| `publishedAt` | `at` | direct | high | |
| `features` | known dimensions on the row | direct | high | no postingHour derive here |
| `hasLegacyMediaUrl` | `Boolean(mediaUrl)` | deterministically_derived | high | URL value never emitted |

Batch helper `adaptSnsAiHistoryRowsToStrategyPostEvidence` fail-closes if any row account differs.

GrowthStrategySnapshot is produced only via Phase 4 `buildStrategyParity` + `projectToGrowthStrategySnapshot`. No second persisted-strategy adapter.
