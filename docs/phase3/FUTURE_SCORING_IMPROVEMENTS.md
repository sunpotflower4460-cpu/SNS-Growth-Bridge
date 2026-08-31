# Future scoring improvements

Recorded during Phase 3. **Not implemented.** Changing any of these would require a new scoring-behavior version (`sns-ai-parity-v1` → something else), not a silent edit.

## Include likes in the vector

- **Idea:** Use `likes` in share or a dedicated rate.
- **Current behavior:** Collected, stored on `RawMetricVector`, ignored by the scorer.
- **Possible benefit:** X/IG collectors already have the signal.
- **Risk:** Breaks SNS-AI parity; changes every historical score.
- **Would require scorer version bump?:** YES

## Rebalance X weights

- **Idea:** Give X a watchQuality or followRate weight like Instagram.
- **Current behavior:** X uses profileRate/clickRate; Instagram uses followRate/watchQuality.
- **Possible benefit:** More comparable cross-platform scores.
- **Risk:** Asymmetry is current production behavior.
- **Would require scorer version bump?:** YES

## Improve confidence

- **Idea:** Bayesian / Wilson / sample-weighted confidence.
- **Current behavior:** `0.7 * clamp(n/10) + 0.3 * clamp(log10(exposure+1)/4)`, 2-decimal round.
- **Possible benefit:** Less cliff at n=10; better low-exposure handling.
- **Risk:** Downstream thresholds (anomaly brake) assume the current scale.
- **Would require scorer version bump?:** YES

## Cross-platform baseline

- **Idea:** Pool peers across X and Instagram.
- **Current behavior:** Same platform only.
- **Possible benefit:** More peers for small accounts.
- **Risk:** Metrics are not commensurate; Instagram watchQuality vs X clickRate.
- **Would require scorer version bump?:** YES

## Creator-wide / workspace baseline

- **Idea:** Fall back to `creatorId` or `workspaceId` when `accountId` has few peers.
- **Current behavior:** Account-relative only; missing `accountId` fails closed.
- **Possible benefit:** Multi-account creator view.
- **Risk:** Mixes distinct audiences; violates SNS-AI parity.
- **Would require scorer version bump?:** YES

## Sample weighting / recency

- **Idea:** Weight recent or high-exposure peers more in the median.
- **Current behavior:** Unweighted median of selected peers.
- **Possible benefit:** Less pull from tiny posts.
- **Risk:** Changes baseline for every account.
- **Would require scorer version bump?:** YES

## First-truthy exposure

- **Idea:** Use max(impressions, reach, views) or a defined hierarchy that treats `0` as present.
- **Current behavior:** `impressions || reach || views || 0` (0 is skipped).
- **Possible benefit:** Less surprising when impressions is explicitly 0.
- **Risk:** Changes exposure and all rates.
- **Would require scorer version bump?:** YES
