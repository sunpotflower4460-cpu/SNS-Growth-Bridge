# Phase 2 Contract Review — carry-forward notes

Status: **not implemented**. Recorded during Phase 1 tooling bootstrap so Phase 2 revises contracts against the Phase 0 audit instead of coding the current `docs/CONTRACTS.md` as-is.

Sources:

- `docs/audit/MY_SNS_CURRENT_STATE.md`
- `docs/audit/SNS_AI_CURRENT_STATE.md`
- `docs/audit/MAPPING_MATRIX.md`
- `docs/CREATOR_SUPPORT_LOOP.md`
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

---

## 7. Add a creator-action recommendation contract

The growth loop should not stop at “write a better next post.” It must eventually be able to say what **new creator input** is missing.

Example:

```text
Evidence:
- close/medium vertical acoustic-performance posts have high profile-transition rate
- Aquarium performs well
- Aquarium has too few matching reusable clips

Recommendation:
Record two 20–30 second vertical Aquarium chorus clips, medium/close framing.
```

Phase 2 should review and runtime-validate a new immutable advisory contract such as:

```ts
interface CreatorActionRecommendation {
  meta: EnvelopeMeta
  recommendationId: string
  subject: GrowthSubjectRef
  type: 'asset_request' | 'capture_request' | 'profile_update' | 'information_request'
  objective: string
  priority: 'low' | 'normal' | 'high'
  confidence: number
  generatedAt: string
  expiresAt?: string
  rationale: RecommendationRationale
  requestedAction: CreatorRequestedAction
  relatedStrategyId?: string
  relatedPostIds: string[]
}
```

See `docs/CREATOR_SUPPORT_LOOP.md` for the full candidate shape.

Important boundaries:

- Bridge emits immutable advice only.
- My-SNS may later materialize this as a mutable Creator Task.
- Bridge does not own task status, capture UI, upload UI, or Asset Library.
- Recommendation confidence and evidence must be explicit.
- Lack of evidence must not be turned into a confident creator request.
- Performance evidence must not pressure the creator to produce unwanted/private/unsafe material.

No My-SNS or SNS-AI adapter is required to produce this contract in Phase 2 unless a source mapping is already proven.

---

## 8. Add Human Anchor and Orbit contracts

We want a selectable mode in which creator-led activity is the **Anchor** and SNS-AI supports it with surrounding **Orbit** content.

Example:

```text
Human Anchor:
"久しぶりにRe:tripを二人で歌いました"

Possible Orbit:
- another Re:trip angle/performance
- a travel/worldview post related to the song
- a lyric-entry post

A preplanned direct Re:trip promotion may now be redundant and should be recommended for replacement/delay.
```

Phase 2 should review and runtime-validate:

- `HumanAnchorEvent`
- `OrbitPlan`
- `OrbitItem`
- `ScheduleAdjustmentRecommendation`

These are canonical **plans/recommendations**, not provider-side effects.

Bridge must never directly:

- cancel a My-SNS PublishJob
- mutate an SNS-AI schedule
- publish an Orbit post
- infer external publication success without proof

The future consumer applies the plan according to the creator-selected support posture.

---

## 9. Automation posture must remain an explicit future opt-in

The product should eventually support a creator-selectable posture conceptually similar to:

```text
OFF
RECOMMEND_ONLY
ASSISTED_ORBIT
AUTO_ORBIT_WITH_GUARDRAILS
```

But Phase 2 contracts must **not** enable automation.

Current SNS-AI remains manual-only. Adding an `OrbitPlan` schema is not authorization to modify `runtime-policy.json`, enable accounts, restore schedules, auto-engage, auto-DM, or publish.

A later product/runtime phase must define:

- explicit creator consent
- allowed platforms/accounts
- frequency limits
- quiet windows
- approval requirements
- cancellation/override behavior
- provider-policy gates
- incident stop controls

---

## 10. Anchor / Orbit must preserve the learning hierarchy

Anchor/Orbit is not a loophole around creator preference.

Priority remains:

```text
Safety / platform rules
> explicit creator instructions
> Brand Profile
> creator correction evidence
> audience performance evidence
> trend / exploration hints
```

Human Anchor context may make a stale AI plan contextually wrong, but the first system behavior should be a `ScheduleAdjustmentRecommendation`, not an unconditional cancellation.

---

## 11. Phase 2 scope after these additions

Phase 2 should now:

1. redesign source-neutral identity (`GrowthSubjectRef` or equivalent)
2. update `docs/CONTRACTS.md` to match the audited reality
3. implement runtime-validated canonical contracts
4. add `likes?: number` as raw-preservation only if approved
5. preserve the current SNS-AI scoring semantics untouched
6. preserve My-SNS human-correction semantics untouched
7. add contracts for creator-action recommendations
8. add contracts for Human Anchor / Orbit planning
9. add positive and negative fixtures for every new contract
10. explicitly document which contracts currently have no producing adapter

Phase 2 must not:

- port scorer logic yet
- build My-SNS Creator Tasks
- add durable My-SNS engagement metrics
- detect asset shortages automatically
- enable SNS-AI autopilot
- modify provider schedules or publishing
- modify My-SNS or SNS-AI production repositories
