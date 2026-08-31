# AGENTS.md — SNS Growth Bridge

This file is the operating contract for Cursor Agent, Claude Code, Codex, and other coding agents working in this repository.

Read these files before changing code:

1. `docs/ARCHITECTURE.md`
2. `docs/CONTRACTS.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/CURSOR_AGENT_IMPLEMENTATION.md`

---

## Mission

Build a shared creator-growth brain that allows My-SNS and SNS-AI to share versioned growth intelligence while remaining independent products.

Do not merge the products.

---

## Repository role

SNS-Growth-Bridge owns:

- canonical contracts
- adapters
- pure scoring
- pure strategy learning
- shared experiment contracts/primitives
- integration fixtures/tests

It does not own:

- publishing
- OAuth
- provider credentials
- workspaces/auth UI
- inbox sending
- autonomous schedule activation
- GitHub Actions operations from SNS-AI

---

## Hard prohibitions

Unless a human explicitly changes this architecture:

1. **Do not copy My-SNS into this repository.**
2. **Do not copy SNS-AI into this repository.**
3. **Do not create social-provider OAuth flows here.**
4. **Do not add X/Meta/TikTok/YouTube create-post calls here.**
5. **Do not create a second publish queue.**
6. **Do not store OAuth access/refresh tokens.**
7. **Do not enable SNS-AI accounts, cron schedules, provider polling, or engagement.**
8. **Do not modify My-SNS production behavior before shadow-mode validation.**
9. **Do not delete existing My-SNS or SNS-AI learning logic before parity tests pass.**
10. **Do not call a simple AI-draft approval a human correction.** A correction requires an actual content difference.
11. **Do not let performance learning override explicit creator/Brand Profile constraints.**
12. **Do not invent contract mappings when source fields do not exist.** Mark them unavailable and stop that mapping.

---

## Priority order for intelligence

Any generation/ranking integration must preserve:

```text
Safety / platform rules
> current explicit human instruction
> Brand Profile hard constraints
> pinned / explicit creator feedback
> human correction learning
> audience performance strategy
> trend / exploration guidance
```

If a performance pattern conflicts with a creator hard rule, the creator hard rule wins.

---

## Development method

Use small PR-sized phases.

For each phase:

1. inspect current source repositories first
2. record source commit SHAs in audit docs
3. implement pure logic before I/O
4. add fixtures
5. add tests
6. run full `npm run check`
7. document any semantic difference
8. do not expand scope because adjacent code looks convenient

---

## Source-repository policy

When reading My-SNS or SNS-AI:

- use current `main` unless the task names another ref
- record the commit SHA used by the audit
- cite exact source paths in mapping documentation
- prefer current implementation over stale roadmap prose
- do not assume a schema from old docs when current code differs

When changing My-SNS or SNS-AI in a future phase:

- use a dedicated branch/PR in that repository
- do not push cross-repository changes directly to main as part of bridge work
- keep each integration PR independently reversible

---

## Compatibility rule

The first bridge implementation should preserve current SNS-AI scoring semantics.

If the bridge and current SNS-AI scorer disagree:

- do not silently choose the bridge output
- create a fixture reproducing the difference
- classify it as bug fix or intentional behavior change
- document it
- require explicit approval before changing consumer behavior

---

## Data minimization

Bridge fixtures and contracts must not contain:

- API keys
- OAuth tokens
- refresh tokens
- cookies
- webhook secrets
- signed private media URLs
- payout/tax data

Use synthetic identifiers and sanitized public-like content in fixtures.

---

## No third database by default

Do not add Supabase/Postgres/Redis to the bridge during v1.

The initial bridge is a pure package workspace.

Shared persistence requires an explicit architecture decision after read-only integration proves it is needed.

---

## No third app by default

Do not create a Next.js/React UI or long-running API server during v1.

If a runtime becomes necessary, first write an ADR explaining why library/package integration is insufficient.

---

## Expected package structure

```text
packages/
  contracts/
  scoring/
  strategy/
  adapters-my-sns/
  adapters-sns-ai/
  testing/
```

Use strict TypeScript for bridge packages. SNS-AI remains free to consume emitted JavaScript/JSON contracts.

---

## Required quality gates

Before a phase is considered done:

- lint passes
- typecheck passes
- unit tests pass
- build passes
- contract fixtures pass runtime validation
- no secret-like values are introduced
- docs reflect the implemented behavior

CI should run these gates on PRs and pushes to main.

---

## Required full-loop fixture

The repository must eventually contain a deterministic fixture proving:

```text
AI proposal
-> human edits it
-> correction event exists
-> post is published successfully
-> mature metrics arrive
-> performance score is computed
-> growth strategy is produced
-> next-generation guidance contains:
   A. creator preference evidence
   B. audience performance evidence
```

The two evidence types must remain separately inspectable.

---

## Stop conditions

Stop and report instead of guessing when:

- a My-SNS metric source cannot be identified
- publication success cannot be mapped unambiguously
- workspace/account identity is ambiguous
- a proposed contract would require secrets
- an integration would require enabling autonomous SNS-AI runtime
- a schema change would break an existing consumer
- current docs contradict current implementation and the correct behavior cannot be proven

A blocked, well-documented phase is preferable to a fabricated integration.
