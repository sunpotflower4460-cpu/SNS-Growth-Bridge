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

**Phase 4 SNS-AI strategy learning parity.** `@sns-growth-bridge/strategy` ports `buildStrategy()` as `sns-ai-learn-parity-v1`, reusing `@sns-growth-bridge/scoring` (`sns-ai-parity-v1`) unmodified for scoring. Adapters remain Phase 1 skeletons. Contracts remain schema major `1`.

Phase 0 audit is in [`docs/audit/`](./docs/audit/). Phase 3 notes are in [`docs/phase3/`](./docs/phase3/). Phase 4 notes are in [`docs/phase4/`](./docs/phase4/).

### Develop

Requires Node.js 22+.

```text
npm ci
npm run check
```

`npm run check` runs lint, typecheck, test, and build.

Do not invent `creatorId` from `ownerId` / acting user / SNS-AI `accountId`. Do not change scoring formulas during parity. Do not enable SNS-AI autopilot.

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

Phase 5+ (adapters, experiments, My-SNS integration, Creator Action / Anchor / Orbit generation) is not started. Do not start it in a strategy-parity PR. SNS-AI remains manual-only.
