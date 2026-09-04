# Phase 6 — SNS-AI adapter limitations

Phase 6 proves fixture → Canonical conversion only.

## no My-SNS account mapping

SNS-AI `account` becomes Canonical `subject.accountId`. It is not a My-SNS `workspaceId`, `creatorId`, or `SocialAccount.id`. No mapping table is introduced.

## no cross-repo post reconciliation

Canonical ids stay producer-local:

```text
my-sns:publish-job:<job.id>
sns-ai:<account>:<providerPostId>
```

The same provider post may exist in both products. Future candidate: `platform + externalPostId`. Not implemented.

## no Artist Support canonical mapping

SNS-AI `src/artist/bridge-contracts.mjs` (CreatorActionRecommendation, ArtistContextEvent, ArtistFunnelSnapshot, Orbit-adjacent shapes) is not Bridge Canonical. Phase 6 does not map CreatorAction, HumanAnchor, Orbit, or Funnel.

## no runtime JSONL transport

No `readHistoryFromDisk` / `readMetricsFromDisk` / `readFeedbackFromDisk`. Callers later supply sanitized objects.

## no provider access

No X / Instagram / TikTok / YouTube live fetch. Collectors stay in SNS-AI.

## no automatic strategy execution

Adapter may feed Phase 4 `buildStrategyParity()` in an offline test. It does not write `data/strategies`, run `learnAll`, or change generation behavior.

## no autonomy activation

SNS-AI `config/runtime-policy.json` is unchanged:

- `manualOnly: true`
- `allowAutomaticAccountActivation: false`
- `allowAutomaticEngagement: false`
- `allowScheduledProviderPolling: false`

## other intentional non-goals

- Canonical schema major stays `1`
- Phase 3 `sns-ai-parity-v1` scorer unchanged (`likes` still unused)
- Phase 4 `sns-ai-learn-parity-v1` unchanged
- My-SNS repository unchanged
- private / signed URLs never emitted
- published `media[]` empty (no proven Canonical media type)
- extra SNS-AI metric keys not added to RawMetricVector
