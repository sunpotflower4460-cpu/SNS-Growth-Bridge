# SNS-Growth-Bridge

Shared creator-growth intelligence layer for **My-SNS** and **SNS-AI**.

This repository does **not** merge the two products.

- **My-SNS** stays the creator-facing SaaS, publishing source of truth, approval UI, OAuth owner, and publish queue.
- **SNS-AI** stays the operator/autonomous growth engine and keeps its own runtime safety posture.
- **SNS-Growth-Bridge** provides shared contracts, adapters, scoring, strategy learning, experiment primitives, and integration tests.

## Target loop

```text
My-SNS usage
  -> AI proposal
  -> creator correction / approval
  -> successful publication
  -> mature metrics
  -> SNS-Growth-Bridge scoring + learning
  -> GrowthStrategySnapshot
  -> better My-SNS proposal guidance
  -> optional SNS-AI strategy / experiment consumption
  -> repeat
```

The key design principle is that two forms of learning remain separate:

1. **Creator preference** — what the human intentionally prefers, learned from Brand Profile, explicit feedback, and real corrections.
2. **Audience performance** — what recently worked better, learned from mature metrics and controlled experiments.

Performance evidence never overrides explicit creator constraints.

---

## Start here

Coding agents must read, in order:

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
3. [`docs/CONTRACTS.md`](./docs/CONTRACTS.md)
4. [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md)
5. [`docs/CURSOR_AGENT_IMPLEMENTATION.md`](./docs/CURSOR_AGENT_IMPLEMENTATION.md)

Cursor-specific guardrails are also in:

- [`.cursor/rules/sns-growth-bridge.mdc`](./.cursor/rules/sns-growth-bridge.mdc)

---

## Current execution state

**Phase 1 tooling bootstrap.** Canonical contracts, scoring, and adapters are not implemented yet.

Phase 0 audit is in [`docs/audit/`](./docs/audit/) (merged via PR #7). Phase 2 contract-review carry-forwards (identity, `likes`, blocked My-SNS metrics) are recorded in [`docs/PHASE_2_CONTRACT_REVIEW.md`](./docs/PHASE_2_CONTRACT_REVIEW.md) and must not be treated as approved mappings.

### Develop

Requires Node.js 22+.

```text
npm ci
npm run check
```

`npm run check` runs lint, typecheck, test, and build.

Workspace packages are **skeletons** in this phase: they export package identity only. No `creatorId` mapping, no MetricSnapshot adapter, no SNS-AI scorer port, no provider I/O.

---

## Bridge v1 package plan

```text
packages/
  contracts/          # versioned runtime-validated canonical schemas
  scoring/            # pure metric normalization/scoring
  strategy/           # pure growth strategy learning
  adapters-my-sns/    # read-only source adapter
  adapters-sns-ai/    # read-only source/consumer adapter
  testing/            # fixtures + cross-repo contract harness
```

No production database, UI, social OAuth, direct provider publishing, or automatic engagement belongs here in v1.

---

## Source-of-truth boundaries

### My-SNS owns

- workspaces / creator UI
- Brand Profile / Seed / Draft / Revision
- human approval
- social credentials
- PublishJob / PublishAttempt
- publication idempotency
- Inbox / messaging

### SNS-AI owns

- operator/autonomous runtime state
- trend/policy research runtime
- autonomous experiments and candidate operations
- manual-only/autopilot posture

### Bridge owns

- canonical growth contracts
- adapters
- scoring semantics
- strategy snapshots
- shared experiment contracts/primitives
- integration fixtures and compatibility tests

---

## Next phase

Phase 2 is **canonical contracts + runtime validation**, after the identity review in [`docs/PHASE_2_CONTRACT_REVIEW.md`](./docs/PHASE_2_CONTRACT_REVIEW.md). Do not port scoring or adapters in the same change.
