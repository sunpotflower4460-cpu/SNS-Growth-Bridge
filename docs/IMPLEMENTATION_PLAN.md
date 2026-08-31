# SNS Growth Bridge — Implementation Plan

Status: execution plan for Cursor Agent / coding agents

This plan intentionally avoids a big-bang merge. My-SNS and SNS-AI must remain usable independently throughout the migration.

---

## Phase 0 — Audit only, no production-code changes

Goal: verify the exact current shapes in My-SNS and SNS-AI before writing adapters.

Deliverables:

- `docs/audit/MY_SNS_CURRENT_STATE.md`
- `docs/audit/SNS_AI_CURRENT_STATE.md`
- `docs/audit/MAPPING_MATRIX.md`

The mapping matrix must cover at least:

- workspace / creator identity
- Brand Profile
- draft and revision identity
- published post identity
- social account identity
- metric checkpoint storage
- feature metadata
- experiment metadata
- explicit human feedback
- current strategy shape
- current runtime safety posture

Rules:

- do not invent missing fields
- do not modify either source repository during this phase
- record exact source file paths and current commit SHAs
- explicitly list every uncertain mapping

Exit criterion:

Every field in `docs/CONTRACTS.md` is classified as one of:

1. directly available
2. derivable deterministically
3. unavailable — contract must remain optional or implementation is blocked

---

## Phase 1 — Bootstrap pure TypeScript workspace

Goal: create the bridge as a testable package repository with no external side effects.

Recommended baseline:

- Node 22
- TypeScript strict mode
- npm workspaces
- Vitest
- ESLint
- JSON-schema or runtime contract validation
- no database
- no network API server

Target structure:

```text
packages/
  contracts/
  scoring/
  strategy/
  adapters-my-sns/
  adapters-sns-ai/
  testing/
```

Root scripts:

```json
{
  "build": "...",
  "lint": "...",
  "typecheck": "...",
  "test": "...",
  "check": "npm run lint && npm run typecheck && npm test && npm run build"
}
```

Add CI on pull_request and main push.

Exit criterion:

`npm run check` passes from a clean clone.

---

## Phase 2 — Canonical contracts first

Goal: implement `packages/contracts` before any integration logic.

Required exported contracts:

- EnvelopeMeta
- GrowthSubjectRef
- Platform
- CreatorProfileSnapshot
- HumanCorrectionEvent
- ExplicitFeedbackEvent
- GrowthFeatureDimension
- PublishedPostSnapshot
- MetricSnapshot
- NormalizedMetricVector
- PerformanceScore
- StrategyPattern
- GrowthStrategySnapshot
- HumanPreferenceSummary
- ExperimentDefinition
- ExperimentAssignment
- ExperimentResult
- CreatorActionRecommendation
- HumanAnchorEvent
- OrbitPlan
- ScheduleAdjustmentRecommendation

Requirements:

- runtime validation, not TypeScript-only types
- deterministic parse failures
- unknown major schema version rejection
- fixtures for valid/invalid payloads
- no secrets accepted in contract fixtures

Exit criterion:

Both a JS consumer and a TS consumer can parse/validate fixture payloads.

---

## Phase 3 — Port SNS-AI scoring as pure logic

Goal: move behavior, not runtime.

Source behavior to preserve initially:

- metric normalization
- account-relative baseline scoring
- platform-weighted components
- confidence calculation
- mature-checkpoint filtering

Do not copy:

- JSONL file I/O
- GitHub Actions
- provider fetch code
- account activation logic
- publish code

Required golden tests:

Use the same synthetic snapshots through:

1. current SNS-AI scorer
2. new bridge scorer

The outputs must match within an explicitly defined tolerance.

If behavior is intentionally changed, document the migration and add before/after fixtures.

Exit criterion:

Golden compatibility tests prove scoring parity.

---

## Phase 4 — Port strategy learning as pure logic

Goal: implement `buildGrowthStrategy(input)` without I/O.

Initial feature dimensions:

- topic
- angle
- hook
- emotion
- format
- cta
- mediaDecision
- postingHour

Preserve current concepts:

- configurable strategy window
- mature metrics only
- minimum samples per pattern
- lift relative to account baseline
- confidence from sample size
- preferred / avoid lists
- explore rate

Add requirements not currently guaranteed by all callers:

- evidence post IDs
- machine-readable provenance
- human-readable rationale
- immutable strategy ID/version
- insufficient-evidence state

Exit criterion:

Fixture input produces a stable, snapshot-tested `GrowthStrategySnapshot`.

---

## Phase 5 — Build My-SNS adapter in read-only mode

Goal: prove My-SNS can supply canonical inputs without changing My-SNS behavior.

Important: The first integration may live as a fixture/export script in this repository. Do not immediately add a runtime dependency to My-SNS.

Adapter mapping to implement:

### Brand Profile

My-SNS `BrandProfile` -> `CreatorProfileSnapshot`.

### Human correction

A My-SNS `DraftRevision` becomes `HumanCorrectionEvent` only when:

- source is AI
- `aiOriginalSnapshot` exists
- at least one of title/body/CTA/hashtags differs

Preserve the existing My-SNS semantic that simple approval is not learning evidence.

### Published post

Build `PublishedPostSnapshot` only from a publication known to have succeeded.

Do not infer success from a scheduled job or from a network call that returned ambiguously.

### Metrics

Map existing My-SNS analytics storage to canonical `MetricSnapshot` after Phase 0 confirms the exact current schema.

Exit criterion:

A sanitized My-SNS fixture can be converted into all available canonical events with zero mutation.

---

## Phase 6 — Build SNS-AI adapter

Goal: let SNS-AI consume bridge strategy without changing its operational posture.

Mappings:

- history -> PublishedPostSnapshot
- metric snapshots -> MetricSnapshot
- human feedback -> ExplicitFeedbackEvent
- GrowthStrategySnapshot -> SNS-AI generation/decision context

Hard safety invariant:

Running adapter tests must not:

- change `manualOnly`
- enable accounts
- add schedules
- publish
- poll providers
- send engagement

Exit criterion:

SNS-AI can consume a bridge fixture strategy in a dry unit test while its runtime policy remains identical.

---

## Phase 7 — Shadow strategy in My-SNS

Goal: produce strategy using real My-SNS data, but do not influence generation yet.

Recommended implementation:

- My-SNS calls/imports the bridge strategy package in a server-only path, or runs an explicit strategy job.
- Persist or log the resulting immutable strategy snapshot in a debug-safe location.
- Display strategy in an internal/admin UI only.

Track:

- sample size
- confidence
- preferred/avoid patterns
- generation time
- input window
- whether a strategy was neutral due to insufficient evidence

Exit criterion:

At least one real workspace produces a strategy snapshot with explainable evidence and no change to live publishing behavior.

---

## Phase 8 — Feed soft strategy into My-SNS draft generation

Goal: improve proposals without allowing metrics to override creator identity.

Current My-SNS generation context already includes:

- Seed
- Brand Profile
- recent edited AI revision examples

Add:

- `GrowthStrategySnapshot` as soft performance guidance

Prompt ordering must encode this priority:

```text
Safety / platform rules
> explicit current instruction
> Brand Profile
> human correction examples
> Growth Strategy
> trends / exploration
```

The prompt must say explicitly:

> Performance observations are advisory. Never override Brand Profile, explicit human feedback, factual constraints, or safety rules.

UI requirement:

Add an explainability affordance such as `Why this draft?` showing:

- creator-style evidence used
- performance evidence used
- exploration choice, if any

Exit criterion:

A/B fixture tests show that strategy can change a draft recommendation while explicit creator constraints still win.

---

## Phase 9 — Candidate ranking and explore/exploit

Goal: share higher-level decision primitives without turning on autonomous posting.

Implement:

- candidate advice contract
- configurable explore rate
- deterministic experiment assignment
- candidate rationale

Recommended initial behavior:

- 80% exploit / 20% explore is a configurable example, not a hardcoded product default
- exploration must never violate creator hard constraints
- experiments must be single-variable where possible

Exit criterion:

Given the same inputs and experiment seed, candidate assignment is deterministic and explainable.

---

## Phase 10 — Promote SNS-AI engines selectively

Move or reuse, one capability at a time:

1. Performance Strategy Learning
2. Candidate Ranking
3. Explore / Exploit
4. Trend Research contracts
5. Experiment definitions/results
6. Media QA contracts
7. Anomaly / autonomy brake signals
8. Cost optimization signals
9. only later: autonomous engagement

Do not move GitHub Actions orchestration into the bridge.

---

## Phase 11 — Optional shared persistence

Do this only after a proven need.

Potential persisted objects:

- GrowthStrategySnapshot
- HumanPreferenceSummary
- ExperimentDefinition / Result
- strategy audit/provenance

Forbidden:

- social OAuth credentials
- provider secrets
- raw session tokens
- private inbox payloads by default

---

## Phase 12 — Controlled autonomy

This phase is outside the bridge's authority.

SNS-AI may use shared strategy for unattended operation only after its own launch conditions are satisfied, including provider setup, billing, permissions, controlled live post, metric verification, and explicit operator activation.

The bridge must not contain code that automatically changes SNS-AI runtime policy.

---

# Cross-repository rollout order

Use this exact order unless an audit reveals a blocker:

```text
1. SNS-Growth-Bridge only
2. My-SNS read-only exporter/adapter test
3. SNS-AI read-only adapter test
4. My-SNS shadow strategy
5. My-SNS soft generation guidance
6. shared experiment/candidate logic
7. SNS-AI consumes shared strategy
8. only then consider removing duplicated pure logic
```

Never begin by deleting existing working learning code.

---

# Migration rule: duplicate before replace

For scoring/learning migration:

1. keep current SNS-AI implementation
2. implement bridge equivalent
3. run both on the same fixture/real sanitized snapshot
4. compare outputs
5. resolve differences
6. switch one consumer to bridge
7. observe
8. only then remove duplicated pure logic

This is required to avoid silently changing account strategy behavior.

---

# Testing matrix

Minimum tests:

### Contract tests

- valid payload accepted
- unsupported version rejected
- negative metrics rejected
- invalid skip rate rejected
- forbidden secret fixture rejected

### My-SNS adapter tests

- unchanged AI draft approval -> no HumanCorrectionEvent
- body edit -> correction event
- hashtag-only edit -> correction event
- template draft -> no AI correction event
- failed publish -> no PublishedPostSnapshot
- successful publish -> snapshot

### SNS-AI adapter tests

- history row mapping
- mature checkpoint mapping
- human feedback mapping
- bridge strategy -> current decision context
- manual-only runtime files remain unchanged

### Scoring tests

- zero exposure
- no baseline
- account baseline
- platform weight override
- watch-quality calculation
- confidence bounds

### Strategy tests

- insufficient samples
- preferred pattern
- avoid pattern
- low confidence
- posting-hour derivation
- unknown feature dimension

### End-to-end fixture

```text
AI draft
-> human edits opening
-> approves
-> published successfully
-> 24h metric checkpoint arrives
-> performance scoring
-> strategy generation
-> next-generation context contains both:
   - creator correction evidence
   - audience performance evidence
```

The test must prove these two evidence streams are separately labeled.

---

# Definition of Done for Bridge v1

Bridge v1 is complete when:

- contracts package is versioned and validated
- scoring parity with current SNS-AI is tested
- strategy builder is pure and deterministic
- My-SNS adapter can produce canonical correction/publication/metric fixtures
- SNS-AI adapter can consume strategy without runtime changes
- one end-to-end fixture proves the learning loop
- CI runs lint/typecheck/test/build
- no external publishing or credentials exist in the bridge
- docs match actual implementation
