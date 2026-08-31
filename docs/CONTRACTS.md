# SNS Growth Bridge — Canonical Contracts

Status: **Phase 2 implemented** (`packages/contracts`, schema major `1`)

These contracts let My-SNS and SNS-AI share growth intelligence without sharing internal persistence, OAuth, or runtime models.

All contracts are versioned, JSON-serializable, immutable payloads. Runtime validation is fail-closed.

This document matches the implemented Zod schemas. Older design drafts that required a first-class `creatorId` on every payload are superseded.

Phase 2 ships **contracts and validators only**. It does not implement scoring, strategy builders, adapters, task UI, Anchor detection, Orbit generation, schedule mutation, or any My-SNS / SNS-AI runtime change.

---

## 1. Global conventions

### EnvelopeMeta

Required on every top-level growth payload.

```ts
interface EnvelopeMeta {
  schemaVersion: number // major; currently must be 1
  producer: 'my-sns' | 'sns-ai' | 'sns-growth-bridge'
  producedAt: string // ISO 8601 datetime with offset, including Z
  traceId: string // non-empty
}
```

`producer` names a **logical origin**. Accepting the enum is not the same as saying that origin currently emits live payloads. See [Producer availability](#19-producer-availability).

### Identity — GrowthSubjectRef

Phase 0 proved neither My-SNS nor SNS-AI has a first-class `creatorId`. Canonical payloads therefore carry a source-neutral subject instead of required `creatorId` / `workspaceId` / `accountId` triples.

```ts
interface GrowthSubjectRef {
  creatorId?: string
  workspaceId?: string
  accountId?: string
}
```

Runtime rule: **at least one** of `creatorId`, `workspaceId`, `accountId` must be a non-empty string after trim. Otherwise validation fails closed.

Forbidden implicit mappings (never performed by this package):

- `creatorId = Workspace.ownerId`
- `creatorId = Seed.createdBy`
- `creatorId = acting user`
- `creatorId = SNS-AI accountId`
- `creatorId = provider-native ID`

Unknown extra identity keys such as `ownerId` are **stripped**, not promoted to `creatorId`.

Provider-native IDs belong in explicit `external*` fields. Never use email, access token, refresh token, API key, or secret as an identity key.

Growth-domain payloads use `subject: GrowthSubjectRef` rather than leaking source-repo identity columns.

---

## 2. Schema version

`schemaVersion` is the **integer major**.

| Constant | Value | Why |
| --- | --- | --- |
| `CURRENT_SCHEMA_VERSION` | `1` | First runtime-validated schema. The design-draft required `creatorId` on most payloads; Phase 0 showed that requiredness is false. That identity change is a semantic break, so this is major 1 rather than “draft 0 plus optional fields.” There are no v0 runtime consumers. |

Policy:

1. This package accepts only major `1`. Unsupported majors fail closed (no coercion).
2. Additive optional fields may remain within a major if old consumers can ignore them.
3. Unknown object keys are **stripped** (not stored). A newer writer of the same major does not crash an older reader.
4. Renames, requiredness changes, enum narrowing, identity-model changes, and metric/correction semantic changes require a **new major**.
5. Unknown enum values fail closed.
6. No silent best-effort coercion for identity or metric fields.

---

## 3. Platform type

```ts
type Platform =
  | 'x'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'threads'
  | 'facebook'
  | 'note'
  | 'website'
```

Unknown platforms fail validation until deliberately added.

---

## 4. CreatorProfileSnapshot

Creator identity constraints and preferences used by shared intelligence.

```ts
interface CreatorProfileSnapshot {
  meta: EnvelopeMeta
  subject: GrowthSubjectRef
  profileVersion: string
  name?: string
  audience?: string
  language?: string
  voiceTraits: string[]
  values: string[]
  preferredTerms: string[]
  avoidedTerms: string[]
  defaultCallToAction?: string
  hardRules: CreatorHardRule[]
}

interface CreatorHardRule {
  id: string
  type: 'prefer' | 'avoid' | 'must' | 'never'
  scope: 'all' | Platform
  text: string
  source: 'brand-profile' | 'explicit-feedback' | 'operator'
  pinned: boolean
}
```

Hard rules outrank audience-performance learning. This contract must never include OAuth or private messaging credentials.

---

## 5. HumanCorrectionEvent

Produced only when a human **actually changes** an AI-originated draft and approves the changed result.

Simple approval with no human edit is **not** a correction event.

```ts
interface HumanCorrectionEvent {
  meta: EnvelopeMeta
  eventId: string
  subject: GrowthSubjectRef
  platform: Platform
  seedId?: string
  draftId: string
  revisionId: string
  aiGenerationId?: string
  occurredAt: string
  before: DraftContentSnapshot
  after: DraftContentSnapshot
  changedFields: Array<'title' | 'body' | 'hashtags' | 'cta'>
}

interface DraftContentSnapshot {
  title?: string
  body: string
  hashtags: string[]
  cta?: string
}
```

Frozen My-SNS meaning (`wasRevisionEditedByHuman`):

```text
source == AI
AND aiOriginalSnapshot exists
AND human-approved revision differs
```

Compared fields: title, body, CTA, hashtags. **Hashtags are order-insensitive.**

Not a HumanCorrection:

- AI draft approved unchanged
- template source
- missing `aiOriginalSnapshot`
- hashtag order only
- reply-learning verbatim approval

Contract validation requires `changedFields.length >= 1` and that `changedFields` **match** the derived title/body/CTA/hashtag-set difference. Unedited approval and hashtag-order-only payloads fail closed.

Template source and missing snapshot are adapter-level gates (Phase 5+). The contract itself cannot see My-SNS `source` / `aiOriginalSnapshot`; adapters must not emit this event unless those gates pass.

`packages/contracts` exports `deriveChangedFields` and `isHumanCorrectionContent` so adapters can share the same comparison.

---

## 6. ExplicitFeedbackEvent

Direct creator/operator statements such as prefer/avoid/correct/pin/note.

```ts
interface ExplicitFeedbackEvent {
  meta: EnvelopeMeta
  eventId: string
  subject: GrowthSubjectRef
  action: 'prefer' | 'avoid' | 'correct' | 'pin' | 'note'
  dimension?: GrowthFeatureDimension
  value?: string
  note: string
  active: boolean
  occurredAt: string
}
```

Pinned / explicit feedback outranks inferred performance patterns.

---

## 7. GrowthFeatureDimension

Initial dimensions follow current SNS-AI learning behavior.

```ts
type GrowthFeatureDimension =
  | 'topic'
  | 'angle'
  | 'hook'
  | 'emotion'
  | 'format'
  | 'cta'
  | 'mediaDecision'
  | 'postingHour'
```

Future additions require schema review and fixtures.

---

## 8. PublishedPostSnapshot

A canonical record of content known to have been published.

```ts
interface PublishedPostSnapshot {
  meta: EnvelopeMeta
  postId: string
  subject: GrowthSubjectRef
  platform: Platform
  revisionId?: string
  seedId?: string
  externalPostId?: string
  externalUrl?: string
  publishedAt: string
  text?: string
  media: PublishedMediaSnapshot[]
  features: Partial<Record<GrowthFeatureDimension, string>>
  experimentAssignment?: ExperimentAssignment
}

interface PublishedMediaSnapshot {
  type: 'image' | 'video' | 'audio' | 'document' | 'none'
  role?: 'source' | 'variant' | 'thumbnail' | 'cover' | 'eyecatch'
}
```

`externalPostId` is optional. My-SNS manual / zero-cost publishes can be canonical `PublishedPostSnapshot`s before a provider id exists. `MetricSnapshot.externalPostId` remains required.

Do not place signed storage URLs or provider access credentials in this payload.

---

## 9. MetricSnapshot and RawMetricVector

One metric checkpoint for one published post.

```ts
interface MetricSnapshot {
  meta: EnvelopeMeta
  snapshotId: string
  postId: string
  subject: GrowthSubjectRef
  platform: Platform
  externalPostId: string
  capturedAt: string
  checkpointMinutes: number
  metrics: RawMetricVector
}

interface RawMetricVector {
  impressions?: number
  reach?: number
  views?: number
  likes?: number
  reposts?: number
  quotes?: number
  shares?: number
  bookmarks?: number
  saved?: number
  replies?: number
  comments?: number
  profileClicks?: number
  profileVisits?: number
  urlClicks?: number
  follows?: number
  videoViews?: number
  playback100?: number
  reelSkipRate?: number
}
```

Rules:

- raw provider metrics remain raw; normalization belongs in `packages/scoring` (not implemented in Phase 2)
- count metrics must be finite and `>= 0`
- `NaN` and `Infinity` are rejected
- `reelSkipRate` must be between 0 and 1 inclusive
- negative metrics are invalid
- `MetricSnapshot.externalPostId` is required even when the related `PublishedPostSnapshot` has no provider id yet; do not emit a metric checkpoint until a provider post id exists
- a checkpoint without a resolvable published post must not be used for strategy learning

### `likes` is raw preservation only

`likes?: number` exists because SNS-AI collectors and My-SNS live `PostMetrics` already store likes, while the current SNS-AI scorer does **not** use them.

Phase 3 scoring parity **must ignore `likes`**. Adding the field here is not a scoring-semantics change.

### My-SNS MetricSnapshot producer is blocked

My-SNS currently has:

- no durable metrics table
- no checkpoint model
- no historical metric snapshots

Live fetch requires provider credentials, which Bridge must not hold.

**My-SNS producer currently unavailable / blocked** for `MetricSnapshot`. Do not implement a My-SNS → MetricSnapshot adapter in Phase 2.

SNS-AI `data/metrics.jsonl` is the Phase 3+ scoring parity source. That adapter is also **not implemented** in Phase 2.

The parser still accepts `producer: 'my-sns'` on the envelope enum so a future unblocked producer does not need an enum change. Accepting the string is not a claim that My-SNS currently emits snapshots.

---

## 10. NormalizedMetricVector and PerformanceScore

Internal deterministic scoring output. Types exist for contract completeness. **Scoring is not implemented in Phase 2.**

```ts
interface NormalizedMetricVector {
  exposure: number
  shareRate: number
  saveRate: number
  conversationRate: number
  profileRate: number
  clickRate: number
  followRate: number
  watchQuality: number
}

interface PerformanceScore {
  postId: string
  score: number // 0..100
  confidence: number // 0..1
  baselineCount: number
  vector: NormalizedMetricVector
  baseline: NormalizedMetricVector
  components: Record<string, number>
}
```

A strategy engine must not treat low-confidence scores as equally strong evidence.

---

## 11. StrategyPattern and GrowthStrategySnapshot

The principal audience-performance output. **Builder not implemented in Phase 2.** Provenance fields (`strategyId`, `strategyVersion`, `inputsDigest`, `status`, `evidencePostIds`, `rationale`) are Bridge additions, not current SNS-AI strategy JSON fields.

```ts
interface StrategyPattern {
  dimension: GrowthFeatureDimension
  value: string
  sampleSize: number
  averageScore: number // 0..100
  lift: number
  confidence: number
  rationale: string
  evidencePostIds: string[]
}

interface GrowthStrategySnapshot {
  meta: EnvelopeMeta
  strategyId: string
  strategyVersion: string
  subject: GrowthSubjectRef
  platform: Platform
  generatedAt: string
  sourceWindow: {
    from: string
    to: string
    strategyWindowDays: number
    matureCheckpointMinutes: number
  }
  sampleSize: number
  overallScore: number // 0..100
  confidence: number
  exploreRate: number
  preferred: StrategyPattern[]
  avoid: StrategyPattern[]
  hardConstraintsDigest?: string
  inputsDigest: string
  status: 'active' | 'insufficient-evidence' | 'invalid-input'
}
```

If there is insufficient mature evidence:

```ts
{
  status: 'insufficient-evidence',
  sampleSize: 0,
  confidence: 0,
  preferred: [],
  avoid: []
}
```

Do not fabricate neutral-looking patterns. The validator rejects `insufficient-evidence` payloads that violate those zeros/empties.

`sourceWindow.from` must be `<= sourceWindow.to`. `overallScore` and pattern `averageScore` are 0..100. `status: 'active'` requires `sampleSize >= 1`. Each preferred/avoid pattern requires `sampleSize >= 1`.

---

## 12. HumanPreferenceSummary and CandidateAdvice

Creator-preference evidence is **intentionally distinct** from `GrowthStrategySnapshot`.

```ts
interface HumanPreferenceSummary {
  meta: EnvelopeMeta
  summaryId: string
  subject: GrowthSubjectRef
  platform?: Platform
  generatedAt: string
  sourceCorrectionCount: number
  explicitFeedbackCount: number
  preferences: HumanPreferencePattern[]
}

interface CandidateAdvice {
  meta: EnvelopeMeta
  adviceId: string
  subject: GrowthSubjectRef
  platform: Platform
  strategyId?: string
  goal: 'draft-generation' | 'candidate-ranking' | 'experiment'
  softGuidance: AdviceItem[]
  prohibitedGuidance: AdviceItem[]
}
```

`softGuidance` never overrides Brand Profile or explicit human rules. Preference patterns with `source: 'explicit'` require `explicitFeedbackCount >= 1`. Patterns with `source: 'correction-inference'` require `sourceCorrectionCount >= 1`.

---

## 13. Creator preference vs audience performance

These signal families must stay separately inspectable.

| Family | Meaning | Sources |
| --- | --- | --- |
| Creator preference | what the creator intentionally prefers | Brand Profile, explicit feedback, AI draft → human-edited revision |
| Audience performance | what recently worked for the audience | mature metric snapshots, experiments, performance scores |

Priority for any later generation/ranking integration:

```text
Safety / platform rules
> current explicit human instruction
> Brand Profile hard constraints
> pinned / explicit creator feedback
> human correction learning
> audience performance strategy
> trend / exploration guidance
```

Performance evidence must not overwrite creator identity or explicit preference.

---

## 14. Experiment contracts

```ts
interface ExperimentDefinition {
  meta: EnvelopeMeta
  experimentId: string
  subject: GrowthSubjectRef
  platform: Platform
  dimension: GrowthFeatureDimension
  control: string
  variant: string
  startedAt: string
  status: 'planned' | 'running' | 'completed' | 'cancelled'
}

interface ExperimentAssignment {
  experimentId: string
  dimension: GrowthFeatureDimension
  variant: string
}

interface ExperimentResult {
  meta: EnvelopeMeta
  experimentId: string
  completedAt: string
  controlScore?: number // 0..100
  variantScore?: number // 0..100
  confidence: number
  outcome: 'control' | 'variant' | 'inconclusive'
  notes: string[]
}
```

SNS-AI currently uses `expired` in places. Canonical status is `cancelled`, not a silent rename of live SNS-AI files. Do not automatically turn an inconclusive experiment into a permanent strategy preference. `control` and `variant` must differ.

---

## 15. CreatorActionRecommendation

Immutable advice that the creator should **prepare something** (assets, capture, profile, information). This is **not** a My-SNS Creator Task.

Bridge: “this is worth doing, with evidence.”
My-SNS (future): display as a task; complete / dismiss / upload.

Bridge must **not** store task lifecycle (`open`, `in_progress`, `done`, `dismissed`, `snoozed`).

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
  summary: string // non-empty
  evidenceCount: number // >= 0
  evidenceWindow?: { from: string; to: string }
  observations: string[]
  missingEvidence?: string[]
}

interface AssetRequest {
  kind: 'asset_request'
  songOrSubject?: string
  mediaType: 'video' | 'image' | 'audio' | 'text'
  orientation?: 'vertical' | 'horizontal' | 'square'
  durationSeconds?: { min?: number; max?: number }
  framing?: Array<'wide' | 'medium' | 'close' | 'detail' | 'overhead' | 'pov'>
  quantity?: number
  desiredMoments?: string[]
  notes?: string[]
}
```

Validation:

- empty `rationale.summary` rejected
- negative `evidenceCount` rejected
- `confidence` in `0..1`
- `confidence >= 0.8` with `evidenceCount === 0` rejected (do not fake high confidence)
- `evidenceWindow.from` must be `<= evidenceWindow.to` when present
- `expiresAt` must be `>= generatedAt` when present
- `requestedAction.kind` must equal `type`
- `quantity <= 0` rejected
- duration min/max must be `>= 0`; `min > max` rejected
- empty / unknown `mediaType` or unknown `orientation` rejected

Phase 2 does not detect asset shortage or generate recommendations. Fixtures encode the intended meaning only.

---

## 16. HumanAnchorEvent, OrbitPlan, ScheduleAdjustmentRecommendation

### Principle

```text
Human Anchor  = the creator's real activity
Orbit         = AI support around that activity
```

Orbit is **not** the AI impersonating the creator. Contracts must not be used to generate first-person claims about emotions or events the creator did not express or experience.

### HumanAnchorEvent

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

`external-confirmed` is reserved for a future adapter that **actually confirmed** an external post. Guessing “the creator probably posted this” is not an Anchor. Phase 2 does not detect anchors.

Validation:

- at least one of `publishedPostId` or `externalPostId` is required
- `source === 'external-confirmed'` additionally requires `externalPostId`

### OrbitPlan and OrbitItem

AI support around a Human Anchor. Phase 2 does not generate or publish Orbit items.

```ts
interface OrbitPlan {
  meta: EnvelopeMeta
  orbitPlanId: string
  subject: GrowthSubjectRef
  anchorId: string
  generatedAt: string
  objective: string
  confidence: number
  orbitItems: OrbitItem[]
  scheduleAdjustments?: ScheduleAdjustmentRecommendation[]
  relatedStrategyId?: string
}

interface OrbitItem {
  orbitItemId: string
  type:
    | 'supporting_post'
    | 'alternate_asset'
    | 'story_context'
    | 'lyric_context'
    | 'behind_the_scenes'
    | 'cross_platform_echo'
  platform?: Platform
  timing: 'same_day' | 'within_24h' | 'within_72h' | 'later'
  concept: string
  rationale?: string
  requiresApproval: boolean
}
```

`anchorId` must be non-empty. `orbitItems` must contain at least one item.

### ScheduleAdjustmentRecommendation

Advice only. Bridge does **not** change My-SNS or SNS-AI schedules. Those remain the source of truth.

```ts
interface ScheduleAdjustmentRecommendation {
  adjustmentId: string
  action: 'keep' | 'delay' | 'cancel' | 'replace'
  targetScheduleId: string
  reason: string
  replacementConcept?: string
  confidence: number
}
```

Unknown `action` values fail closed. `targetScheduleId` is required. `action === 'replace'` also requires non-empty `replacementConcept`.

### Automation levels (future note only)

Not a runtime setting in Phase 2. Not a UI. Not an SNS-AI policy change. Not permission to enable Autopilot.

| Level | Meaning |
| --- | --- |
| `OFF` | no Orbit support |
| `RECOMMEND_ONLY` | advice only |
| `ASSISTED_ORBIT` | AI prepares posts/assets/timing; human approval required |
| `AUTO_ORBIT_WITH_GUARDRAILS` | auto-publish only inside a pre-approved envelope |

SNS-AI remains manual-only. New Orbit contracts **do not** authorize enabling accounts, cron, engagement, or autopilot.

---

## 17. Adapter responsibilities (not implemented in Phase 2)

### adapters-my-sns

Must later convert, without changing My-SNS source of truth:

- BrandProfile → CreatorProfileSnapshot
- AI DraftRevision with a real human edit → HumanCorrectionEvent
- successful PublishAttempt + revision/job/account context → PublishedPostSnapshot

Must **not** currently convert My-SNS analytics → MetricSnapshot (blocked).

Must not:

- read or emit OAuth secrets
- publish posts
- change My-SNS rows
- infer a human edit when none exists
- map `ownerId` / acting user to `creatorId`

### adapters-sns-ai

Must later convert:

- SNS-AI post history → PublishedPostSnapshot
- SNS-AI `data/metrics.jsonl` → MetricSnapshot (Phase 3 scoring source)
- human-feedback JSONL → ExplicitFeedbackEvent
- bridge GrowthStrategySnapshot → SNS-AI strategy-compatible context

Must not:

- enable accounts
- modify runtime-policy
- restore cron schedules
- perform provider publishing
- treat new Orbit contracts as autopilot authorization

---

## 18. Schema evolution

1. Additive optional fields may remain within a major only if old consumers can safely ignore them.
2. Renames, semantic changes, required-field changes, identity-model changes, and enum narrowing require a new `schemaVersion`.
3. Every schema version requires fixture coverage.
4. Consumers must reject a newer unsupported major.
5. No silent best-effort coercion for identity or metric fields.
6. Unknown keys are stripped; unknown enums and unsupported majors fail closed.

---

## 19. Producer availability

| Producer enum | Parser accepts it? | Currently emitting live payloads into Bridge? |
| --- | --- | --- |
| `my-sns` | yes | **No.** Adapters are not implemented. MetricSnapshot is **blocked**. |
| `sns-ai` | yes | **No.** Adapters are not implemented. `data/metrics.jsonl` is the intended Phase 3 scoring source. |
| `sns-growth-bridge` | yes | **No generators yet.** Strategy / recommendation / orbit builders are Phase 3+. |

Do not document an unimplemented producer as currently available.

---

## 20. Security classification

### Allowed

- internal IDs (synthetic in fixtures)
- platform names
- post text where needed for learning
- public external post IDs/URLs
- aggregate metrics
- creator style preferences
- experiment metadata
- recommendation rationale text

### Forbidden

- OAuth access token
- refresh token
- API key
- session cookie
- webhook secret
- provider credential
- private signed media URL
- raw private DM content
- payout/tax data

Contract fixtures must use synthetic identifiers only. Secret-shaped strings in fixtures fail tests.
