# Phase 5 — My-SNS adapter limitations

Phase 5 proves fixture → Canonical conversion only.

## no MetricSnapshot

My-SNS `PostMetrics` is live fetch (`views?`, `likes?`, `comments?`, `shares?`) with no durable rows, checkpoints, or `capturedAt` series. Adapter does not invent snapshots from “now”.

`likes` remains a future raw-preservation candidate and is still unused by `sns-ai-parity-v1` scoring.

## no creatorId

My-SNS has workspace/user/owner/approved-by fields. None is `creatorId`. Phase 5 subject is `{ workspaceId }` only.

## no SNS-AI accountId mapping

`SocialAccount.id`, `externalAccountId`, and `PublishJob.socialAccountId` are not Canonical `accountId` and are not SNS-AI `accountId`. Cross-product mapping is blocked.

## no first-class explicit feedback

My-SNS has Brand Profile terms and draft corrections. It has no prefer/avoid/correct/pin/note ledger. Those are not duplicated into `ExplicitFeedbackEvent`.

## no proven PublishedPost features

My-SNS drafts do not store `topic` / `angle` / `hook` / `emotion` / `format` / `cta` (feature enum) / `mediaDecision` / `postingHour`. Phase 5 emits `features: {}`. Seed tags, draft tone, and asset type are not inferred.

## no proven published-media provenance

Seed assets and publish-time signed URLs exist in My-SNS runtime, but job/attempt rows do not record which asset was published. Phase 5 emits `media: []`. Asset URLs and `storagePath` are never copied.

## no cross-repo post identity

Canonical `postId` is `my-sns:publish-job:<id>`. It is not merged with SNS-AI `providerPostId`. Empty `PublishJob.id` is rejected at the adapter boundary so it cannot become `my-sns:publish-job:`.

## no runtime Supabase integration

No database, API, or provider access. Sanitized My-SNS-shaped fixtures only.

## other intentional non-goals

- My-SNS repository unchanged
- SNS-AI unchanged / remains manual-only
- no strategy shadow execution
- no CreatorAction / HumanAnchor / Orbit generation from manual posts
- Brand Profile is not rewritten for performance
- Canonical schema major stays `1`
