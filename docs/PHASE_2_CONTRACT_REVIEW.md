# Phase 2 Contract Review — carry-forward notes

Status: **not implemented**. Recorded during Phase 1 tooling bootstrap so Phase 2 revises contracts against the Phase 0 audit instead of coding the current `docs/CONTRACTS.md` as-is.

Sources:

- `docs/audit/MY_SNS_CURRENT_STATE.md`
- `docs/audit/SNS_AI_CURRENT_STATE.md`
- `docs/audit/MAPPING_MATRIX.md`
- PR #7 review (Phase 0)

Do **not** treat this file as an approved identity mapping. No `creatorId` convention was chosen in Phase 1.

---

## 1. Identity requiredness contradicts the audit

Current `docs/CONTRACTS.md` makes `creatorId` (and often `workspaceId`) required on several payloads.

Phase 0 proved:

- My-SNS has no first-class `creatorId`
- SNS-AI has no creator identity; it has `accountId` keys only
- `Workspace.ownerId`, `Seed.createdBy`, acting user, and SNS-AI `accountId` are **not** interchangeable
- there is no My-SNS ↔ SNS-AI account mapping table

Phase 2 must revise identity to a **source-neutral** shape rather than silently mapping owner/user/account.

Candidate for review (not adopted):

```ts
interface GrowthSubjectRef {
  creatorId?: string
  workspaceId?: string
  accountId?: string
}
```

Runtime rule to consider: require **at least one proven identity**, fail closed otherwise. Do not invent `creatorId` to satisfy a required field.

---

## 2. `likes` on raw metrics

Phase 2 should consider adding `likes?: number` to `RawMetricVector`.

Facts:

- SNS-AI X/IG collectors already store `likes`
- My-SNS live `PostMetrics` includes `likes`
- current SNS-AI `metricVector` / scorer **does not use** likes

If added, treat it as **raw preservation only**. Scorer parity with SNS-AI must remain unchanged unless a later, versioned behavior change is explicitly approved.

---

## 3. My-SNS `MetricSnapshot` stays blocked

My-SNS has no durable metrics store and no checkpoint model. Live fetch requires provider credentials, which Bridge must not hold.

Do not implement a My-SNS `MetricSnapshot` adapter in Phase 2. SNS-AI `data/metrics.jsonl` remains the scoring/learning parity source.

---

## 4. `wasRevisionEditedByHuman` meaning is frozen

My-SNS current rule:

- AI source + `aiOriginalSnapshot` present
- at least one of body / title / CTA / hashtag-set differs (hashtags order-insensitive)
- unedited approval → **not** a correction
- template / missing snapshot → **not** a correction

Phase 2 `HumanCorrectionEvent` must preserve this. Do not emit events for simple approvals. Do not mix in reply-learning (which still includes verbatim AI approvals).

---

## 5. GrowthStrategy provenance is Bridge-generated

Fields such as `strategyId`, `strategyVersion`, `inputsDigest`, `status`, `evidencePostIds`, and `rationale` are **Bridge additions**, not current SNS-AI strategy JSON fields.

SNS-AI `data/strategies/<account>.json` currently has `account`, `generatedAt`, `strategyWindowDays`, `sampleSize`, `overallScore`, `confidence`, `exploreRate`, `preferred`, `avoid`, `featureStats`, `guardrail`. Empty evidence still writes zeros; it has no `insufficient-evidence` status.

Phase 2/4 must not document provenance fields as if they already exist in SNS-AI.

---

## 6. Other Phase 2 reminders from PR #7

- Keep SNS-AI manual-only invariants untouched
- Unknown scoring platforms currently inherit X weights — do not “fix” during a later parity port without an explicit behavior change
- Experiment status vocabulary differs (`expired` vs contract `cancelled`); do not silently rename
- Recommended sequence remains: Phase 1 tooling → Phase 2 contract revision + runtime validation → Phase 3 scorer parity
