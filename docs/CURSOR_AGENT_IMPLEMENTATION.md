# Cursor Agent Implementation Instructions

Use this file as the primary implementation brief for Cursor Agent.

---

## 0. Objective

Implement SNS-Growth-Bridge as a **shared creator-growth intelligence layer** between:

- `sunpotflower4460-cpu/My-SNS`
- `sunpotflower4460-cpu/SNS-AI`

The bridge must improve both systems without merging them.

Desired long-term loop:

```text
My-SNS usage
-> AI proposal
-> creator edit/approval
-> publish
-> metrics
-> bridge scoring/learning
-> GrowthStrategySnapshot
-> better My-SNS proposals
-> optional SNS-AI strategy/research/autopilot consumption
```

The bridge is not allowed to publish posts or hold platform credentials.

---

# 1. Mandatory reading order

Before changing anything:

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/CONTRACTS.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. this file

Then inspect the **current main branch** of My-SNS and SNS-AI.

Do not trust stale roadmap text over current implementation.

---

# 2. Phase 0 task — do this first

Do **not** implement packages yet.

Audit current source repositories and create:

```text
docs/audit/MY_SNS_CURRENT_STATE.md
docs/audit/SNS_AI_CURRENT_STATE.md
docs/audit/MAPPING_MATRIX.md
```

Each audit must include:

- repository full name
- audited commit SHA
- audit date/time UTC
- exact file paths used
- current relevant types/shapes
- current persistence location
- current safety/runtime posture
- known stale docs vs current-code differences
- open questions/blockers

---

# 3. What to inspect in My-SNS

At minimum inspect current implementations for:

## Identity / creator context

- Workspace
- SocialAccount
- BrandProfile

## Content lineage

- Seed
- SocialDraft
- `aiOriginalSnapshot`
- DraftRevision
- approval path
- revision learning path

Confirm the current rule for whether a human edit is learnable.

## Publication truth

- PublishJob
- PublishAttempt
- publish worker
- success/failure/ambiguous handling
- external post ID / URL
- social-account targeting

The bridge must create a canonical PublishedPost only from **known successful publication truth**.

## Metrics

Find the exact current analytics/metric storage and provider ingestion path.

Do not assume field names from the bridge contract. Record:

- tables/types
- checkpoint model
- raw provider metrics
- platform coverage
- whether metrics are per post/account/workspace
- whether external post ID is always available

If a clean mapping cannot be proven, mark MetricSnapshot integration blocked rather than inventing it.

## Existing AI generation context

Confirm where My-SNS currently passes:

- Seed
- Brand Profile
- human-edited examples

into generation.

This will be the later insertion point for soft GrowthStrategy guidance.

---

# 4. What to inspect in SNS-AI

At minimum inspect:

## Performance scoring

- `src/analytics/scorer.mjs`
- metric normalization
- platform weights
- account-relative baseline
- confidence calculation

## Strategy learning

- `src/learning/learn.mjs`
- `src/learning/features.mjs`
- current strategy store
- mature-checkpoint requirement
- strategy window
- min samples
- preferred / avoid
- explore rate

## Human feedback

- feedback actions
- pinned behavior
- rolling window

## Experiment layer

- experiment definition
- assignment
- evaluation

## Runtime posture

Verify current manual-only invariants:

- account enabled state
- runtime policy
- scheduled workflows
- automatic engagement/polling

Do not modify them.

---

# 5. Mapping Matrix format

Create a table like:

| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
|---|---|---|---|---|---|
| `creatorId` | My-SNS | ... | workspace owner / explicit mapping | high | none |
| `MetricSnapshot.metrics.views` | ... | ... | direct | high | none |
| ... | ... | ... | unavailable | n/a | exact reason |

Every field from `docs/CONTRACTS.md` does not need an immediate source, but every Phase 1/2 target must be mapped before coding.

---

# 6. Phase 1 bootstrap instructions

Only begin after Phase 0 has no critical unknowns for contracts/scoring.

Create a strict TypeScript npm workspace.

Suggested root:

```text
package.json
tsconfig.base.json
eslint.config.*
vitest.config.*
.github/workflows/ci.yml
packages/
  contracts/
  scoring/
  strategy/
  adapters-my-sns/
  adapters-sns-ai/
  testing/
```

Requirements:

- Node 22
- strict TS
- ESM-compatible output
- consumable from JS and TS
- runtime contract validation
- no app UI
- no API server
- no database
- no network side effects in unit tests

Root `npm run check` must cover:

- lint
- typecheck
- test
- build

---

# 7. Phase 2 contracts instructions

Implement contracts before adapters.

Use `docs/CONTRACTS.md` as the specification.

Requirements:

- static TS type
- runtime parser/validator
- fixture JSON
- invalid fixture tests
- schema version handling

Tests must prove rejection of:

- unsupported major schema
- negative metrics
- invalid `reelSkipRate`
- missing required IDs
- unsupported platform

Do not put source-repository DB types into canonical contracts.

---

# 8. Phase 3 scoring port instructions

Port the **pure behavior** from SNS-AI scoring.

Do not import SNS-AI file I/O.

Create golden fixtures that run equivalent synthetic inputs through:

- current SNS-AI scorer behavior, represented by captured expected output
- bridge scorer

Initially preserve:

- exposure definition
- share/save/conversation/profile/click/follow rate semantics
- watch-quality behavior
- account-relative baseline median
- score bounds
- confidence semantics
- default platform weights

If a current SNS-AI behavior looks wrong, do not silently fix it during parity port. File/document a follow-up behavior change.

---

# 9. Phase 4 strategy port instructions

Implement a pure function similar to:

```ts
buildGrowthStrategy(input): GrowthStrategySnapshot
```

No filesystem, DB, provider, or GitHub dependency.

Input must include already-resolved canonical posts + metric snapshots + configuration.

Output must add more provenance than current SNS-AI:

- strategy ID/version
- evidence post IDs
- rationale
- input digest
- insufficient-evidence state

Keep current feature dimensions initially:

```text
topic
angle
hook
emotion
format
cta
mediaDecision
postingHour
```

Do not add embedding/LLM strategy inference in v1.

---

# 10. My-SNS adapter instructions

The adapter is read-only.

## HumanCorrectionEvent

Emit only when:

- revision came from AI
- AI original snapshot exists
- human-approved version differs

Required test cases:

- unedited approval -> no event
- body edit -> event
- title-only edit -> event
- CTA-only edit -> event
- hashtag-only edit -> event
- template-sourced revision -> no AI correction event

## PublishedPostSnapshot

Emit only when the existing My-SNS publication truth proves success.

Do not treat:

- scheduled
- queued
- attempted
- ambiguous network response

as published unless My-SNS itself has reconciled it to success.

## MetricSnapshot

Implement only after exact current My-SNS analytics shape is documented.

---

# 11. SNS-AI adapter instructions

Read-only / pure mapping first.

Map:

- history -> PublishedPostSnapshot
- metric snapshots -> MetricSnapshot
- human-feedback store -> ExplicitFeedbackEvent
- bridge strategy -> SNS-AI decision context

Add a regression test that reads the SNS-AI manual-only policy fixture/current expected values and proves adapter code does not mutate operational state.

The bridge is not allowed to enable autopilot.

---

# 12. Integration behavior in My-SNS — later PR

Do not implement this inside Bridge until bridge packages and adapters are stable.

When later modifying My-SNS, use a separate My-SNS PR.

Current generation behavior should evolve from:

```text
Seed
+ Brand Profile
+ recent human correction examples
```

into:

```text
Seed
+ Brand Profile
+ recent human correction examples
+ GrowthStrategySnapshot (soft guidance)
```

Prompt rule:

> Growth/performance evidence is advisory only. Never override Brand Profile, explicit creator instructions, factual constraints, or safety/platform rules.

Add `Why this draft?` or equivalent explainability before considering deeper automation.

---

# 13. Do not over-merge the two learning systems

Maintain separate concepts:

## Human preference

Question:

> What does this creator intentionally prefer?

Sources:

- explicit feedback
- human edits
- Brand Profile

## Performance strategy

Question:

> What recently worked better with this audience?

Sources:

- mature metrics
- controlled experiments

A creator may prefer a style that performs less well. That is allowed.

Never convert performance evidence into a creator identity rule automatically.

---

# 14. Security / privacy constraints

Do not move into Bridge:

- provider tokens
- session cookies
- webhook secrets
- private signed URLs
- raw private DMs
- payout/tax information

Add a fixture secret-scan test or equivalent static test.

---

# 15. Commit / PR discipline

Recommended PR sequence in SNS-Growth-Bridge:

1. `audit: map current My-SNS and SNS-AI integration surfaces`
2. `build: bootstrap strict TypeScript workspace`
3. `feat: add canonical growth contracts`
4. `feat: port metric scoring with parity fixtures`
5. `feat: add pure growth strategy builder`
6. `feat: add read-only My-SNS adapter`
7. `feat: add read-only SNS-AI adapter`
8. `test: add full-loop deterministic integration fixture`

Do not combine all phases into one huge PR.

---

# 16. Completion report format

At the end of each task, report:

```text
Phase:
Files changed:
Tests added:
Commands run:
Result:
Source repo SHAs used:
Behavior intentionally unchanged:
Known blockers:
Recommended next phase:
```

Do not say an integration is complete if only interfaces exist and no fixture/test proves the mapping.

---

# 17. First Cursor Agent prompt

Use this as the first task given to Cursor Agent:

> Read AGENTS.md, docs/ARCHITECTURE.md, docs/CONTRACTS.md, docs/IMPLEMENTATION_PLAN.md, and docs/CURSOR_AGENT_IMPLEMENTATION.md. Perform **Phase 0 only**. Do not implement packages and do not change My-SNS or SNS-AI. Audit the current `main` branches of `sunpotflower4460-cpu/My-SNS` and `sunpotflower4460-cpu/SNS-AI`. Record the exact commit SHAs. Create `docs/audit/MY_SNS_CURRENT_STATE.md`, `docs/audit/SNS_AI_CURRENT_STATE.md`, and `docs/audit/MAPPING_MATRIX.md`. Map current types/persistence/runtime behavior to the canonical contracts, especially human correction evidence, publication-success truth, metrics, growth features, performance scoring, explicit feedback, experiments, and SNS-AI manual-only invariants. Mark unknown mappings as blockers rather than guessing. Finish with a recommendation on whether Phase 1 can begin.
