# SNS Growth Bridge — Canonical Contracts

Status: implementation contract draft

The goal of these contracts is to let My-SNS and SNS-AI share growth intelligence without sharing internal persistence or runtime models.

All contracts are versioned, JSON-serializable, immutable payloads.

---

## 1. Global conventions

### Required on every top-level payload

```ts
interface EnvelopeMeta {
  schemaVersion: number
  producer: 'my-sns' | 'sns-ai' | 'sns-growth-bridge'
  producedAt: string // ISO 8601 UTC
  traceId: string
}
```

### Identity rules

- `creatorId` is a growth-domain identity, not a platform OAuth identity.
- `workspaceId` may map 1:1 to a My-SNS workspace initially.
- `accountId` identifies a publishing account inside the growth domain.
- Provider-native IDs must be placed in explicit `external*` fields.
- Never use email, access token, refresh token, API key, or secret as an identity key.

---

## 2. Platform type

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

Unknown platforms must fail validation until deliberately added.

---

## 3. CreatorProfileSnapshot

Represents creator identity constraints and preferences that may be used by shared intelligence.

```ts
interface CreatorProfileSnapshot {
  meta: EnvelopeMeta
  creatorId: string
  workspaceId: string
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

This contract must never include OAuth or private messaging credentials.

---

## 4. HumanCorrectionEvent

Produced when a human actually changes an AI-originated draft and approves the changed result.

Simple approval with no human edit is **not** a correction event.

```ts
interface HumanCorrectionEvent {
  meta: EnvelopeMeta
  eventId: string
  creatorId: string
  workspaceId: string
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

Adapter requirement for My-SNS:

- source must be an AI-backed revision
- `aiOriginalSnapshot` must exist
- body/title/CTA/hashtags must differ after normalization
- hashtag comparison should be order-insensitive unless a future platform requires ordered tags

---

## 5. ExplicitFeedbackEvent

Used for direct creator/operator statements such as prefer/avoid/correct/pin/note.

```ts
interface ExplicitFeedbackEvent {
  meta: EnvelopeMeta
  eventId: string
  creatorId: string
  workspaceId: string
  accountId?: string
  action: 'prefer' | 'avoid' | 'correct' | 'pin' | 'note'
  dimension?: GrowthFeatureDimension
  value?: string
  note: string
  active: boolean
  occurredAt: string
}
```

Pinned feedback outranks inferred performance patterns.

---

## 6. GrowthFeatureDimension

Initial dimensions are based on current SNS-AI learning behavior.

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

## 7. PublishedPostSnapshot

A canonical record of content that is known to have been published.

```ts
interface PublishedPostSnapshot {
  meta: EnvelopeMeta
  postId: string
  creatorId: string
  workspaceId: string
  accountId: string
  platform: Platform
  revisionId?: string
  seedId?: string
  externalPostId: string
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

Do not place signed storage URLs or provider access credentials in this payload.

---

## 8. MetricSnapshot

Represents one metric checkpoint for one published post.

```ts
interface MetricSnapshot {
  meta: EnvelopeMeta
  snapshotId: string
  postId: string
  creatorId: string
  workspaceId: string
  accountId: string
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

- raw provider metrics remain raw in this contract
- normalization happens inside `packages/scoring`
- negative metrics are invalid
- `reelSkipRate` must be between 0 and 1
- a metric checkpoint without a resolvable published post must not be used for strategy learning

---

## 9. NormalizedMetricVector

Internal deterministic scoring output.

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
```

The first implementation should preserve current SNS-AI semantics unless an explicit migration is approved.

---

## 10. PerformanceScore

```ts
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

## 11. StrategyPattern

```ts
interface StrategyPattern {
  dimension: GrowthFeatureDimension
  value: string
  sampleSize: number
  averageScore: number
  lift: number
  confidence: number
  rationale: string
  evidencePostIds: string[]
}
```

Example rationale:

> First-person experiment hooks were +18 lift versus this account's recent baseline (n=7, confidence 0.72).

---

## 12. GrowthStrategySnapshot

The principal output consumed by both My-SNS and SNS-AI.

```ts
interface GrowthStrategySnapshot {
  meta: EnvelopeMeta
  strategyId: string
  strategyVersion: string
  creatorId: string
  workspaceId: string
  accountId: string
  platform: Platform
  generatedAt: string
  sourceWindow: {
    from: string
    to: string
    strategyWindowDays: number
    matureCheckpointMinutes: number
  }
  sampleSize: number
  overallScore: number
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

Do not fabricate neutral-looking patterns.

---

## 13. HumanPreferenceSummary

This is intentionally distinct from `GrowthStrategySnapshot`.

```ts
interface HumanPreferenceSummary {
  meta: EnvelopeMeta
  summaryId: string
  creatorId: string
  workspaceId: string
  platform?: Platform
  generatedAt: string
  sourceCorrectionCount: number
  explicitFeedbackCount: number
  preferences: HumanPreferencePattern[]
}

interface HumanPreferencePattern {
  type: 'prefer' | 'avoid' | 'style'
  dimension?: GrowthFeatureDimension | 'language' | 'tone' | 'length' | 'wording'
  value: string
  confidence: number
  source: 'explicit' | 'correction-inference'
  rationale: string
}
```

Initial implementation may keep My-SNS's existing few-shot correction learning as-is. Do not prematurely replace it with a new inference model.

---

## 14. CandidateAdvice

Optional advisory contract for candidate generation/ranking.

```ts
interface CandidateAdvice {
  meta: EnvelopeMeta
  adviceId: string
  creatorId: string
  accountId: string
  platform: Platform
  strategyId?: string
  goal: 'draft-generation' | 'candidate-ranking' | 'experiment'
  softGuidance: AdviceItem[]
  prohibitedGuidance: AdviceItem[]
}

interface AdviceItem {
  dimension?: GrowthFeatureDimension
  text: string
  priority: number
  evidence?: string
}
```

`softGuidance` never overrides Brand Profile or explicit human rules.

---

## 15. Experiment contracts

```ts
interface ExperimentDefinition {
  meta: EnvelopeMeta
  experimentId: string
  creatorId: string
  accountId: string
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
  controlScore?: number
  variantScore?: number
  confidence: number
  outcome: 'control' | 'variant' | 'inconclusive'
  notes: string[]
}
```

Do not automatically turn an inconclusive experiment into a permanent strategy preference.

---

## 16. Adapter responsibilities

### adapters-my-sns

Must convert, without changing My-SNS source of truth:

- BrandProfile -> CreatorProfileSnapshot
- AI DraftRevision with real human edit -> HumanCorrectionEvent
- successful PublishAttempt + revision/job/account context -> PublishedPostSnapshot
- My-SNS analytics checkpoints -> MetricSnapshot

Must not:

- read or emit OAuth secrets
- publish posts
- change My-SNS rows
- infer a human edit when none exists

### adapters-sns-ai

Must convert:

- SNS-AI post history -> PublishedPostSnapshot
- SNS-AI metric snapshots -> MetricSnapshot
- human-feedback JSONL -> ExplicitFeedbackEvent
- bridge GrowthStrategySnapshot -> current SNS-AI strategy-compatible context

Must not:

- enable accounts
- modify runtime-policy
- restore cron schedules
- perform provider publishing

---

## 17. Schema evolution

Rules:

1. Additive optional fields may remain within a schema version only if old consumers can safely ignore them.
2. Renames, semantic changes, required-field changes, and enum narrowing require a new `schemaVersion`.
3. Every schema version requires fixture coverage for both adapters.
4. Consumers must reject a newer unsupported major schema version.
5. No silent best-effort coercion for identity or metric fields.

---

## 18. Security classification

### Allowed in Bridge contracts

- internal IDs
- platform names
- post text where explicitly needed for learning
- public external post IDs/URLs
- aggregate metrics
- creator style preferences
- experiment metadata

### Forbidden

- OAuth access token
- refresh token
- API key
- session cookie
- webhook secret
- private signed media URL
- raw DM content unless a future explicit messaging-learning contract is separately reviewed
- payout/tax data

Any adapter test fixture containing strings that look like secrets should fail secret-scan tests.
