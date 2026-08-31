# Creator Support Loop — Asset Requests and Anchor / Orbit

Status: **Phase 2 contracts implemented.** Runtime generation, Creator Task UI, asset-shortage detection, Anchor detection, Orbit publishing, and adapters are **not** implemented.

This document extends SNS-Growth-Bridge from "better post advice" into a shared contract layer that can also express:

1. **what the creator should do next** when the learning system detects a missing input or asset, and
2. **how AI should support a human-led post or activity** without impersonating or replacing the creator.

The Bridge still does **not** publish, schedule provider posts, hold OAuth credentials, or own mutable task state.

---

## 1. Product principle

The desired loop is broader than draft optimization:

```text
creator activity in My-SNS
  -> publish / metrics / correction evidence
  -> SNS-AI / Bridge performance learning
  -> detect opportunity or missing input
  -> CreatorActionRecommendation
  -> My-SNS presents a Creator Task
  -> creator records/uploads the requested asset
  -> My-SNS Asset Library becomes richer
  -> SNS-AI can use the new asset in future proposals
  -> repeat
```

Example:

```text
Observed evidence over 30 days:
- acoustic performance posts are strong
- close/medium vertical performances have high profile-transition rate
- Re:trip has abundant reusable assets
- Aquarium performs well but has too few suitable assets

Recommendation:
"Record two 20–30 second vertical Aquarium chorus clips, medium/close framing."
```

This must be evidence-backed. The system must not turn every speculative idea into a creator task.

---

## 2. Responsibility boundaries

### SNS-AI owns / produces evidence for

- performance learning
- content/asset opportunity detection
- campaign/trend context
- candidate strategic needs
- optional autonomous/orbit planning logic in later phases

### SNS-Growth-Bridge owns

- canonical immutable recommendation contracts
- evidence/provenance shape
- confidence and insufficiency semantics
- Anchor / Orbit contracts
- adapter contracts and deterministic validation

### My-SNS owns

- creator-facing UI
- mutable Creator Task state (`open`, `done`, `dismissed`, etc.)
- Asset Library
- upload/capture flows
- approval / scheduling / publishing
- user consent / automation preference UI

Bridge recommendation objects are immutable advice. My-SNS may materialize them into mutable tasks, but that task lifecycle does not belong in Bridge v1.

---

## 3. CreatorActionRecommendation

Phase 2 should review a canonical contract similar to:

```ts
interface CreatorActionRecommendation {
  meta: EnvelopeMeta
  recommendationId: string
  subject: GrowthSubjectRef
  type: 'asset_request' | 'capture_request' | 'profile_update' | 'information_request'
  objective: string
  priority: 'low' | 'normal' | 'high'
  confidence: number // 0..1
  generatedAt: string
  expiresAt?: string
  rationale: RecommendationRationale
  requestedAction: CreatorRequestedAction
  relatedStrategyId?: string
  relatedPostIds: string[]
}

interface RecommendationRationale {
  summary: string
  evidenceCount: number
  evidenceWindow?: {
    from: string
    to: string
  }
  observations: string[]
  missingEvidence?: string[]
}

type CreatorRequestedAction =
  | AssetRequest
  | CaptureRequest
  | ProfileUpdateRequest
  | InformationRequest
```

Phase 2 should not finalize exact names until the identity redesign is complete.

### AssetRequest candidate

```ts
interface AssetRequest {
  kind: 'asset_request'
  songOrSubject?: string
  mediaType: 'video' | 'image' | 'audio' | 'text'
  orientation?: 'vertical' | 'horizontal' | 'square'
  durationSeconds?: {
    min?: number
    max?: number
  }
  framing?: Array<'wide' | 'medium' | 'close' | 'detail' | 'overhead' | 'pov'>
  quantity?: number
  desiredMoments?: string[]
  notes?: string[]
}
```

Example canonical payload concept:

```text
CreatorActionRecommendation
  type: asset_request
  objective: increase_profile_to_music_conversion
  requestedAction:
    songOrSubject: Aquarium
    mediaType: video
    orientation: vertical
    durationSeconds: 20..30
    framing: [medium, close]
    quantity: 2
  rationale:
    "Close/medium acoustic performance posts have high profile-transition rate,
     while Aquarium lacks matching reusable assets."
  confidence: 0.78
```

---

## 4. Recommendation guardrails

A recommendation must be **advisory**, not a command.

Minimum rules:

1. `confidence` must be explicit.
2. Evidence must identify why the request exists.
3. Insufficient evidence must not be disguised as certainty.
4. Creator preference / Brand Profile / explicit instructions outrank performance opportunity.
5. Recommendations must not pressure the creator to disclose private, unsafe, intimate, or unwanted material.
6. The same missing asset should not create repeated spammy tasks without new evidence.
7. Dismissed recommendations should be able to inform My-SNS/SNS-AI later, but dismissal semantics are a future feedback contract, not Phase 2 runtime behavior.
8. Bridge does not decide whether a creator is physically available to record something.

---

## 5. Human Anchor

A **Human Anchor** is a creator-originated post/activity that should shape nearby AI support.

Typical example:

```text
Human manually posts:
"久しぶりにRe:tripを二人で歌いました"
```

The system should treat this as a new local context, not ignore it and continue an unrelated precomputed schedule.

Candidate contract:

```ts
interface HumanAnchorEvent {
  meta: EnvelopeMeta
  anchorId: string
  subject: GrowthSubjectRef
  platform: Platform
  source: 'my-sns-manual' | 'my-sns-approved' | 'external-confirmed'
  publishedPostId?: string
  externalPostId?: string
  occurredAt: string
  theme?: string
  entities?: AnchorEntity[]
  summary?: string
  confidence: number
}

interface AnchorEntity {
  type: 'song' | 'project' | 'product' | 'person' | 'event' | 'topic'
  value: string
}
```

`external-confirmed` must only be used when a future adapter can prove the external post. Do not infer anchors from unverified provider state.

---

## 6. Orbit concept

An **Orbit** is AI-generated supporting activity around a Human Anchor.

The product principle is:

> The AI does not replace the creator's voice. It amplifies the wave created by the creator.

Example:

```text
Anchor:
  Human post about Re:trip performance

Potential Orbit A:
  another angle / older Re:trip performance

Potential Orbit B:
  a creator-worldview post about travel / place / inspiration

Potential Orbit C:
  a lyric-entry post connected to Re:trip
```

Orbit planning should also be able to recommend cancelling, delaying, or replacing a conflicting planned post.

---

## 7. OrbitPlan contract candidate

Phase 2 should review a canonical immutable plan shape similar to:

```ts
interface OrbitPlan {
  meta: EnvelopeMeta
  orbitPlanId: string
  subject: GrowthSubjectRef
  anchorId: string
  generatedAt: string
  objective: string
  confidence: number
  items: OrbitItem[]
  scheduleAdjustments: ScheduleAdjustmentRecommendation[]
  status: 'active' | 'insufficient-evidence' | 'invalid-input'
}

interface OrbitItem {
  orbitItemId: string
  platform: Platform
  role: 'amplify' | 'context' | 'story' | 'conversion' | 'follow-up'
  timing: {
    notBeforeMinutes?: number
    notAfterMinutes?: number
  }
  assetPreference?: {
    mediaType?: 'video' | 'image' | 'audio' | 'text'
    songOrSubject?: string
  }
  guidance: string[]
  evidencePostIds: string[]
  confidence: number
}

interface ScheduleAdjustmentRecommendation {
  targetPlanOrCandidateId?: string
  action: 'cancel' | 'delay' | 'replace' | 'keep'
  reason: string
  confidence: number
}
```

Bridge only describes the plan. It does not mutate My-SNS PublishJobs or SNS-AI schedules.

---

## 8. Selectable support / automation posture

The creator should be able to choose how far AI support may go.

This is a **future product/runtime policy**, not a Bridge side effect.

Candidate conceptual modes:

```text
OFF
  No Anchor/Orbit behavior.

RECOMMEND_ONLY
  Detect Anchor and show suggested Orbit plan; human approves everything.

ASSISTED_ORBIT
  AI may prepare drafts/assets/schedule suggestions around the Anchor;
  publishing still requires approval.

AUTO_ORBIT_WITH_GUARDRAILS
  AI may publish Orbit items only inside explicit creator-approved rules,
  provider policy, frequency limits, quiet windows, and safety constraints.
```

Do not enable `AUTO_ORBIT_WITH_GUARDRAILS` by adding Bridge contracts. It requires a later explicit product/runtime phase and must preserve SNS-AI's current manual-only posture until separately approved.

---

## 9. Anchor precedence over stale plans

If a Human Anchor conflicts with a previously planned AI post, the system should prefer contextual coherence over blindly following the old queue.

But the initial implementation should produce a **recommendation**, not directly cancel a post.

Example:

```text
preplanned AI candidate:
  "Listen to Re:trip"

new Human Anchor:
  creator has just posted Re:trip manually

Bridge / SNS-AI output:
  ScheduleAdjustmentRecommendation(action='replace')
  reason='The human anchor already covers the direct Re:trip promotion intent.'
```

My-SNS or SNS-AI runtime may apply the recommendation only according to the user's selected support mode.

---

## 10. Data loop back from My-SNS

When the creator completes an asset request:

```text
CreatorActionRecommendation
  -> My-SNS Creator Task
  -> creator records/uploads
  -> Asset Library
  -> future Seed / candidate generation can reference the new asset
```

Phase 2 should **not** define a mutable task-completion database contract in Bridge unless needed for interoperability.

Later, a compact `RecommendationOutcomeEvent` may be useful:

```ts
interface RecommendationOutcomeEvent {
  recommendationId: string
  outcome: 'completed' | 'dismissed' | 'expired' | 'partially-completed'
  occurredAt: string
  producedAssetIds?: string[]
  note?: string
}
```

This should be considered in a later phase after My-SNS task UX exists.

---

## 11. Why this matters strategically

Without this layer, the system can optimize only from what already exists.

With it, the system can identify **missing creative inputs** and ask the human for the highest-value next contribution.

That creates a stronger division of labor:

```text
SNS-AI
  decides what evidence suggests is needed

SNS-Growth-Bridge
  turns that need into a canonical, explainable, confidence-bearing recommendation

My-SNS
  gives the human a place to respond, record, upload, approve, and publish
```

Anchor / Orbit adds the complementary direction:

```text
Human creator
  creates the authentic anchor

SNS-AI
  supports and extends the anchor

Bridge
  keeps the support explainable and interoperable

My-SNS
  remains the human control surface and publication source of truth
```

This is intentionally **human-led growth intelligence**, not an AI identity replacement system.

---

## 12. Phase 2 scope recommendation

Phase 2 should:

- revise source-neutral identity first
- add runtime-validated contracts for `CreatorActionRecommendation`
- add runtime-validated contracts for `HumanAnchorEvent`
- add runtime-validated contracts for `OrbitPlan` and `ScheduleAdjustmentRecommendation`
- keep every new field additive/optional where evidence is not yet available
- add positive/negative fixtures
- document that no source adapter produces these contracts yet unless proven

Phase 2 should **not**:

- create My-SNS Creator Tasks
- detect assets automatically
- enable SNS-AI autopilot
- cancel scheduled posts
- publish Orbit content
- change My-SNS / SNS-AI source repositories

Those belong to later phases after the contracts and scoring parity are stable.
