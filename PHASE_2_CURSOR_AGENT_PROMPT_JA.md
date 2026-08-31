# Cursor Agent Phase 2 実行指示書

対象Repository: `sunpotflower4460-cpu/SNS-Growth-Bridge`

前提main:

- Phase 0 Audit merged
- Phase 1 Tooling Bootstrap merged
- Phase 2開始前mainは `ef5dd8c6de58efc3a58a818c6bbe8fcee52dcc9a` 以降
- `docs/CREATOR_SUPPORT_LOOP.md` と更新済み `docs/PHASE_2_CONTRACT_REVIEW.md` を必ず読む

今回は **Phase 2: Canonical Contract Revision + Runtime Validation Only** です。

Scoring、Adapter、My-SNS/SNS-AI本体変更、自動投稿には進まないでください。

---

## 1. 最初に読む順番

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/CONTRACTS.md`
4. `docs/PHASE_2_CONTRACT_REVIEW.md`
5. `docs/CREATOR_SUPPORT_LOOP.md`
6. `docs/audit/MY_SNS_CURRENT_STATE.md`
7. `docs/audit/SNS_AI_CURRENT_STATE.md`
8. `docs/audit/MAPPING_MATRIX.md`
9. `docs/IMPLEMENTATION_PLAN.md`
10. `docs/CURSOR_AGENT_IMPLEMENTATION.md`

現在のコード/監査結果を古い設計文書より優先してください。

---

## 2. Phase 2の目的

Phase 0監査で判明した現実と矛盾しない、source-neutralなCanonical Contractsを確定し、`packages/contracts`へruntime validation付きで実装します。

さらに今回、投稿最適化だけでなく、次のHuman-in-the-loop支援を将来可能にするContractを追加します。

1. `CreatorActionRecommendation`
   - AIが「次に何を撮る/用意するべきか」を理由付きで人間へ提案
2. `HumanAnchorEvent`
   - 人間自身の投稿/活動をAnchorとして表現
3. `OrbitPlan`
   - Anchorの周囲をAIがどう支援するかを提案
4. `ScheduleAdjustmentRecommendation`
   - Anchor発生時に古い予定をcancel/delay/replace/keepする提案

重要: Contractを追加してもAutopilotを有効化する許可にはなりません。

---

## 3. 最初にIdentity Contractを解決する

現在の`docs/CONTRACTS.md`は`creatorId`を多数のpayloadで必須にしていますが、Phase 0監査で両Source Repoともfirst-class creatorIdを持たないことが確定しています。

`Workspace.ownerId`、`Seed.createdBy`、acting user、SNS-AI `accountId`を勝手にcreatorIdとして採用しないでください。

Phase 2ではsource-neutral identityを正式に設計してください。

推奨方向:

```ts
interface GrowthSubjectRef {
  creatorId?: string
  workspaceId?: string
  accountId?: string
}
```

Runtime validation rule:

- `creatorId | workspaceId | accountId` のうち少なくとも1つ必須
- 空文字禁止
- Sourceに存在しないIDを補完しない
- Provider-native IDをgrowth identityに流用しない

必要なら`GrowthSubjectRef`を各top-level payloadへ`subject`として持たせ、既存のrequired `creatorId/workspaceId/accountId`を見直してください。

この変更はSemantic changeなので、schemaVersion設計も明示してください。

---

## 4. `docs/CONTRACTS.md`をPhase 0監査へ合わせて修正

最低限:

- Identity requirednessを修正
- My-SNSから現在生成不可能なMetricSnapshotを「Adapter responsibility」として断定しない
- provenance fieldsがBridge-generatedであることを明示
- source未実装のcontractにはproducer未実装と明記
- current SNS-AI behaviorとBridge-added semanticsを混同しない

---

## 5. RawMetricVector

`likes?: number`をraw preservationとして追加してよいです。

理由:

- SNS-AI X/Instagram collectorにlikesが存在
- My-SNS live PostMetricsにもlikesが存在
- 現行SNS-AI scorerはlikesを使用しない

したがってPhase 2では保存/validationのみ行い、Scoring意味論は一切変更しないでください。

Validation:

- 全count metricは0以上
- `reelSkipRate`は0..1
- NaN / Infinity不可

---

## 6. HumanCorrectionEvent

Phase 0で確認したMy-SNS意味論をContract/Testへ固定してください。

Event成立条件:

- AI source
- `aiOriginalSnapshot`あり
- title/body/cta/hashtag-setのいずれかが実際に変更
- hashtag順序のみ変更は変更扱いしない

以下はEvent化禁止:

- 未編集承認
- template source
- snapshot無し
- reply-learningのverbatim approval

Phase 2ではMy-SNS Adapterそのものは実装しませんが、Contract fixtureで意味論を表現してください。

---

## 7. CreatorActionRecommendation

`docs/CREATOR_SUPPORT_LOOP.md`を仕様入力としてruntime-validated contractを追加してください。

目的:

SNS-AI/Bridgeが実績から、Creatorに必要な次の行動を説明可能な形で伝えられるようにする。

例:

```text
Aquariumは反応が良い
+ close/medium縦弾き語りがprofile transitionに強い
+ Aquariumにはその素材が不足
=> 20〜30秒の縦動画を2本撮影してほしい
```

最低フィールド候補:

```ts
CreatorActionRecommendation
- meta
- recommendationId
- subject: GrowthSubjectRef
- type
- objective
- priority
- confidence
- generatedAt
- expiresAt?
- rationale
- requestedAction
- relatedStrategyId?
- relatedPostIds[]
```

V1 action type:

```text
asset_request
capture_request
profile_update
information_request
```

Asset requestでは少なくとも:

- songOrSubject?
- mediaType
- orientation?
- durationSeconds?
- framing?
- quantity?
- desiredMoments?
- notes?

を表現可能にしてください。

Guardrails:

- confidence 0..1
- evidence count明示
- rationale空文字禁止
- requestedActionとtypeの不整合をreject
- quantity <= 0 reject
- duration min > max reject
- evidence不足を高confidenceで偽装しない設計

BridgeはTask状態を持ちません。`open/done/dismissed`等はMy-SNSの将来責務です。

---

## 8. HumanAnchorEvent

Human AnchorはCreator本人が作った波を表します。

Contract候補:

```ts
HumanAnchorEvent
- meta
- anchorId
- subject
- platform
- source
- publishedPostId?
- externalPostId?
- occurredAt
- theme?
- entities?
- summary?
- confidence
```

source候補:

```text
my-sns-manual
my-sns-approved
external-confirmed
```

`external-confirmed`は将来のAdapterが実投稿を証明できる場合のみ。

Unverified external eventをAnchorにしないでください。

---

## 9. OrbitPlan

OrbitはHuman Anchorの周囲でAIが行う支援計画です。

AIが本人の代わりになるのではなく、本人の投稿をAmplifyする思想を守ってください。

最低Contract候補:

```ts
OrbitPlan
- meta
- orbitPlanId
- subject
- anchorId
- generatedAt
- objective
- confidence
- items[]
- scheduleAdjustments[]
- status
```

OrbitItem:

```text
platform
role: amplify | context | story | conversion | follow-up
timing
assetPreference?
guidance[]
evidencePostIds[]
confidence
```

ScheduleAdjustmentRecommendation:

```text
action: cancel | delay | replace | keep
reason
confidence
```

Phase 2では「提案」のSchemaだけです。

絶対にPublishJobやSNS-AI scheduleを変更しないでください。

---

## 10. Automation posture

将来の概念として以下をDocsへ残してよいです。

```text
OFF
RECOMMEND_ONLY
ASSISTED_ORBIT
AUTO_ORBIT_WITH_GUARDRAILS
```

ただしruntime policyとしては実装しないでください。

特に禁止:

- SNS-AI account enable
- manualOnly解除
- liveAccounts追加
- cron/schedule復活
- auto engagement
- auto reply
- auto DM
- provider publish

---

## 11. Runtime validation library

`packages/contracts`にstatic TypeScript typeだけでなくruntime parser/validatorを実装してください。

Libraryは既存workspaceと相性がよく、依存を最小化できるものを選んでください。

採用理由をREADMEへ記録してください。

要件:

- ESM
- JS/TSから利用可能
- parse / safeParse相当
- schemaVersion validation
- unknown unsupported major version fail-closed
- deterministic JSON fixtures

---

## 12. Required contract families

Phase 2で最低限runtime validation対象:

- EnvelopeMeta
- GrowthSubjectRef
- Platform
- CreatorProfileSnapshot
- HumanCorrectionEvent
- ExplicitFeedbackEvent
- GrowthFeatureDimension
- PublishedPostSnapshot
- MetricSnapshot
- RawMetricVector
- NormalizedMetricVector
- PerformanceScore
- StrategyPattern
- GrowthStrategySnapshot
- HumanPreferenceSummary
- CandidateAdvice
- ExperimentDefinition / Assignment / Result
- CreatorActionRecommendation
- HumanAnchorEvent
- OrbitPlan
- ScheduleAdjustmentRecommendation

Scorer/Strategy business logicはまだ実装しないでください。

---

## 13. Required negative tests

最低限reject:

- Identityがcreator/workspace/account全て空
- unsupported platform
- unsupported schema major
- negative metrics
- reelSkipRate <0 or >1
- confidence <0 or >1
- empty required ID
- AssetRequest quantity 0/negative
- duration min > max
- recommendation type/requestedAction mismatch
- OrbitPlan with missing anchorId
- ScheduleAdjustmentRecommendation with empty reason
- invalid HumanAnchor source
- invalid experiment status

---

## 14. Required positive fixtures

少なくとも:

1. My-SNS-like HumanCorrection fixture
2. SNS-AI-like X MetricSnapshot fixture
3. SNS-AI-like Instagram MetricSnapshot fixture
4. insufficient-evidence GrowthStrategy fixture
5. Aquarium `asset_request` fixture
6. Re:trip Human Anchor fixture
7. Re:trip OrbitPlan fixture with a `replace` schedule recommendation

FixtureはSecret scan可能なsynthetic dataだけを使用してください。

---

## 15. Phase 2で絶対に行わないこと

- `packages/scoring` business logic実装
- SNS-AI scorer port
- strategy builder
- My-SNS Adapter
- SNS-AI Adapter
- My-SNS DB migration
- My-SNS durable metrics追加
- Creator Tasks UI
- Asset shortage detector
- Provider API
- OAuth
- Database
- API server
- Autopilot
- My-SNS変更
- SNS-AI変更

---

## 16. Root quality gate

完了前に:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

全て成功させてください。

CIもgreenであること。

---

## 17. PR discipline

Phase 2だけで1 PR。

推奨Title:

```text
feat: add versioned canonical growth contracts
```

Phase 3 Scorer parityを同じPRへ入れないでください。

---

## 18. 完了報告

```text
Phase: Phase 2 Canonical Contracts

Identity decision:
- ...

Contracts implemented:
- ...

Creator support contracts:
- CreatorActionRecommendation
- HumanAnchorEvent
- OrbitPlan
- ScheduleAdjustmentRecommendation

Runtime validation:
- library:
- schema version policy:

Fixtures/tests:
- ...

Commands run:
- npm run lint
- npm run typecheck
- npm test
- npm run build
- npm run check

Behavior intentionally unchanged:
- My-SNS unchanged
- SNS-AI unchanged
- SNS-AI remains manual-only
- no provider side effects
- no scoring behavior implemented

Blocked / deferred:
- My-SNS durable metrics/checkpoints
- My-SNS↔SNS-AI account mapping
- actual Creator Task UX
- actual asset shortage detection
- actual Anchor detection adapter
- actual Orbit publishing

Can Phase 3 start?: YES / NO

Recommended next action:
- ...
```

Phase 2完了後はPhase 3へ勝手に進まずPRを作成して停止してください。
