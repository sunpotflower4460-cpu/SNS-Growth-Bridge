# SNS Growth Bridge — Architecture

Status: design baseline

## 1. Purpose

SNS-Growth-Bridge is **not a third social-media product** and must not become the new owner of My-SNS or SNS-AI business logic.

Its job is to let two intentionally different products share a common creator-growth brain:

- **My-SNS**: creator-facing SaaS / workspace / human-in-the-loop publishing system.
- **SNS-AI**: operator-facing autonomous growth and experimentation engine.
- **SNS-Growth-Bridge**: shared contracts, adapters, learning/scoring primitives, strategy snapshots, and integration tests.

The target loop is:

```text
My-SNS daily use
  -> human edits / approvals / published posts / metrics
  -> canonical bridge events
  -> growth analysis
  -> GrowthStrategySnapshot
  -> My-SNS draft generation guidance
  -> new posts
  -> new metrics
  -> repeat

The same GrowthStrategySnapshot can also be consumed by SNS-AI for research,
experiments, candidate ranking, and future autopilot decisions.
```

The product promise enabled by the bridge is:

> The more a creator uses My-SNS, the better the shared creator-growth brain understands both **what the creator accepts** and **what actually works with the audience**.

These two forms of learning must remain separate signals.

---

## 2. Non-negotiable ownership boundaries

### 2.1 My-SNS remains source of truth for

- workspace identity and membership
- Brand Profile
- Seed
- SocialDraft
- immutable DraftRevision
- AI-original vs human-approved revision history
- connected social accounts and OAuth credentials
- PublishJob / PublishAttempt
- publication ownership and idempotency
- Inbox / messaging UI and human approvals
- creator-facing Analytics UI
- billing / plan / workspace permissions when added

### 2.2 SNS-AI remains source of truth for

- autonomous/operator runtime state
- trend research state
- policy-watch state
- autonomous candidate generation experiments
- operator-oriented account configuration
- manual-only / autopilot operational posture
- autonomous engagement experiments
- experiment runtime state that has not yet been promoted into the shared core

### 2.3 SNS-Growth-Bridge owns only

- canonical integration contracts
- schema versioning
- adapters from My-SNS and SNS-AI shapes into those contracts
- deterministic metric normalization
- performance scoring primitives
- strategy-learning primitives
- human-preference signal contracts
- GrowthStrategySnapshot format
- experiment contracts shared by both products
- contract fixtures and cross-repository integration tests
- compatibility rules and migration policy

---

## 3. Things the Bridge must never own

Do **not** move the following into SNS-Growth-Bridge:

- social OAuth tokens
- provider refresh tokens
- platform credentials
- direct X / Meta / TikTok / YouTube publishing
- publish queues
- retry workers
- external post creation
- direct DM / comment sending
- automatic account activation
- creator workspace UI
- Supabase Auth
- SNS-AI GitHub Actions orchestration
- media uploads or permanent asset storage

The bridge must never become a second publisher. My-SNS already owns robust publish claims, revision ownership, retry protection, and credential refresh behavior. Reimplementing these in the bridge would create duplicate-send and split-brain risk.

---

## 4. Architectural model

```text
                           +------------------------+
                           |    Creator Growth      |
                           |       Contracts        |
                           +-----------+------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
             +---------------+                   +---------------+
             |    My-SNS     |                   |    SNS-AI     |
             | Creator SaaS  |                   | Operator/R&D  |
             +-------+-------+                   +-------+-------+
                     |                                   |
                     | canonical events                  | research / strategy inputs
                     v                                   v
             +---------------------------------------------------+
             |                SNS-Growth-Bridge                  |
             |                                                   |
             | contracts -> adapters -> scoring -> learning      |
             |                    -> strategy snapshots           |
             +----------------------+----------------------------+
                                    |
                                    v
                          GrowthStrategySnapshot
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
          My-SNS draft guidance            SNS-AI decision context
```

The bridge should initially be implemented as **pure packages**, not a long-running service.

A networked worker/API may be added only when an actual deployment requirement exists.

---

## 5. Recommended repository layout

```text
SNS-Growth-Bridge/
  package.json
  tsconfig.json
  README.md
  AGENTS.md
  .cursor/
    rules/
      sns-growth-bridge.mdc
  docs/
    ARCHITECTURE.md
    CONTRACTS.md
    IMPLEMENTATION_PLAN.md
    INTEGRATION_PLAYBOOK.md
  packages/
    contracts/
      src/
      schemas/
      test/
    adapters-my-sns/
      src/
      test/
    adapters-sns-ai/
      src/
      test/
    scoring/
      src/
      test/
    strategy/
      src/
      test/
    testing/
      fixtures/
      contract-harness/
```

Do not create an `apps/` directory until there is a real runtime that cannot remain a library.

---

## 6. Core learning model: two independent axes

### 6.1 Creator Preference / Identity

Source: primarily My-SNS human-approved revisions and explicit feedback.

Examples:

- AI proposed a long opening; creator repeatedly shortens it.
- AI uses a phrase the creator repeatedly removes.
- Creator prefers first-person experiment framing.
- Creator rejects aggressive CTA language even when it performs well.

This signal represents:

> **What the creator wants to sound like.**

It is not a performance score.

### 6.2 Audience Performance

Source: mature publication metrics and explicit experiments.

Examples:

- experiment hooks outperform generic explanation hooks
- posts with image media outperform text-only for a specific account
- one posting-hour bucket has positive lift
- a topic is overused and starts declining

This signal represents:

> **What has recently performed better with the audience.**

It must not override explicit creator identity or safety constraints.

### 6.3 Priority hierarchy

When generating or ranking a candidate, use this order:

```text
1. Safety / legal / platform constraints
2. Explicit current human instruction
3. Brand Profile hard constraints
4. Pinned / explicit creator feedback
5. Human-correction learning
6. Audience performance strategy
7. Trend / exploration suggestions
```

A high-performing pattern is never allowed to override a creator's explicit `avoid` instruction or Brand Profile constraint.

---

## 7. Current source systems that the bridge must respect

### My-SNS facts to preserve

My-SNS already has first-class concepts for:

- BrandProfile
- Seed
- SocialDraft
- immutable DraftRevision
- `aiOriginalSnapshot`
- PublishJob / PublishAttempt
- AI usage accounting

The existing correction-learning path only treats a revision as a learnable edit when the human-approved content actually differs from the AI-original snapshot. The bridge must preserve that rule instead of counting simple approval as preference evidence.

### SNS-AI facts to preserve

SNS-AI currently learns performance strategy from mature post metrics. Its current feature dimensions include:

- topic
- angle
- hook
- emotion
- format
- cta
- mediaDecision
- postingHour

Its scoring logic normalizes platform metrics into rates and scores them relative to the account's own baseline. The bridge should port the **pure scoring/learning behavior**, not SNS-AI's JSONL I/O or GitHub Actions runtime.

SNS-AI is currently intentionally manual-only. Integrating shared intelligence must not silently re-enable autonomous publishing, engagement, provider polling, or account activation.

---

## 8. Data-flow phases

### Phase A — read-only observation

My-SNS exports canonical snapshots/events:

- HumanCorrectionEvent
- PublishedPost
- MetricSnapshot

The bridge computes strategy in read-only mode.

No My-SNS prompt changes yet.

### Phase B — advisory strategy

The bridge emits `GrowthStrategySnapshot`.

My-SNS displays it in an internal/debug view and records whether the strategy would have changed a recommendation.

Still no automatic behavior change.

### Phase C — generation guidance

My-SNS passes the strategy into draft generation as **soft performance guidance**.

Brand Profile and explicit human instructions remain stronger constraints.

### Phase D — candidate ranking / exploration

Shared strategy can influence candidate ranking and experiment allocation.

### Phase E — SNS-AI consumption

SNS-AI consumes the same canonical strategy rather than maintaining an incompatible strategy schema.

### Phase F — controlled autonomy

Only after provider registration, billing, scopes, live-post verification, metrics verification, and explicit operator decision may SNS-AI use shared strategy for unattended operations.

The bridge itself never flips that switch.

---

## 9. Storage strategy

### Initial rule

**Do not create a third durable database yet.**

Use adapters to read from the existing sources of truth and produce immutable strategy artifacts.

For local development/tests, fixtures may be stored in this repository.

### Add shared persistence only when one of these becomes true

- both products need to read the same strategy without recomputation
- historical strategy versioning becomes necessary for explainability
- cross-product experiment assignment requires atomic coordination
- strategy computation becomes too expensive to run on demand

If shared persistence is added, store only growth-domain data. Never copy OAuth secrets or publisher credentials into it.

---

## 10. Strategy versioning

Every emitted strategy must include:

- `schemaVersion`
- `strategyVersion`
- `generatedAt`
- `sourceWindow`
- `sampleSize`
- `confidence`
- `inputsDigest` or equivalent reproducibility identifier
- `preferred`
- `avoid`
- `exploreRate`
- explicit provenance for each recommendation

Strategies are immutable snapshots. Recompute a new snapshot; do not mutate old strategy output in place.

---

## 11. Explainability requirement

Every recommendation that affects content generation or ranking must be explainable in UI-friendly language.

Bad:

> score = 0.81

Good:

> First-person experiment hooks performed +18 lift over the recent account baseline (n=7, confidence 0.72).

The bridge must preserve machine-readable evidence and a human-readable rationale.

---

## 12. Fail-closed rules

When any of the following is missing or invalid, the bridge must return a neutral / no-op strategy rather than inventing evidence:

- insufficient mature metric samples
- unsupported platform
- incompatible schema version
- corrupt metric snapshot
- unknown feature dimension
- missing creator/workspace identity mapping
- ambiguous post identity
- missing publication timestamp when posting-hour analysis is requested

Do not convert missing evidence into fake confidence.

---

## 13. Success definition

The bridge is successful when all of the following are true:

1. My-SNS and SNS-AI can exchange growth-domain data through versioned contracts without importing each other's internal database/runtime types.
2. Existing My-SNS publishing behavior is unchanged unless a strategy is explicitly enabled.
3. Existing SNS-AI manual-only posture remains unchanged.
4. Human correction learning and audience performance learning remain separately inspectable.
5. A deterministic fixture can prove the full loop:
   `AI proposal -> human correction -> publish -> mature metrics -> strategy -> next-generation guidance`.
6. The system can explain why a suggestion was made.
7. Removing the bridge degrades recommendations gracefully but does not break publishing.
