# `@sns-growth-bridge/strategy`

Pure TypeScript port of SNS-AI `src/learning/learn.mjs` `buildStrategy()` (`sns-ai-learn-parity-v1`).

**Phase 4:** exact-match golden parity with frozen SNS-AI `buildStrategy`. Formula, window, latest-then-mature order, grouping, lift, preferred/avoid caps, and rounding are frozen.

Canonical `GrowthStrategySnapshot` projection is a separate function and is not part of SNS-AI parity output.

Does not implement adapters, experiments, CreatorAction, Anchor/Orbit, or provider I/O.

See `docs/phase4/STRATEGY_PARITY.md`.
