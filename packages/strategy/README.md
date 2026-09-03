# `@sns-growth-bridge/strategy`

Pure TypeScript port of SNS-AI `src/learning/learn.mjs` `buildStrategy()` (`sns-ai-learn-parity-v1`).

**Phase 4:** exact-match golden parity for the strategy-learning core (window selection, latest-snapshot selection, mature-checkpoint filtering, scoring integration, feature grouping, lift, ranking, strategy confidence, exploreRate). Formula, ordering, and rounding are frozen.

Does not implement experiments (`ensureExperiment` / `evaluateExperiment`), adapters, CreatorAction generation, Anchor/Orbit runtime, or provider I/O.

See `docs/phase4/STRATEGY_PARITY.md`.
