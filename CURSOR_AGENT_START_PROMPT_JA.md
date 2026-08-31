# Cursor Agent 初回実行指示書

この指示書は `SNS-Growth-Bridge` の最初の実装タスクを Cursor Agent に渡すためのものです。

## 最重要ルール

今回は **Phase 0 の監査だけ**を行ってください。

まだ実装コードを書かないでください。

特に以下は禁止です。

- `My-SNS` のコード変更
- `SNS-AI` のコード変更
- `SNS-AI` の manual-only 設定解除
- 自動投稿、自動返信、自動DM、自動Engagementの有効化
- OAuth、SNS API、Provider Token、Secret の追加・移動
- Bridge用packageの実装開始
- 既存2Repositoryの直接Merge
- 不明な仕様を推測して埋めること

不明点は必ず `blocker` として記録してください。

---

# 目的

`SNS-Growth-Bridge` は `My-SNS` と `SNS-AI` を1つの巨大アプリへ統合するためのRepositoryではありません。

役割は、両者の間で共有できる **Creator Growth Brain / 共通成長知能レイヤー** を作ることです。

長期的には以下のLoopを成立させます。

```text
My-SNSを日常利用
↓
AIが投稿案を生成
↓
Creatorが修正・承認
↓
投稿成功
↓
一定時間後のMetrics取得
↓
SNS-Growth-Bridgeが分析
├─ Creator本人がAI案をどう直したか
└─ 実際にどの投稿戦術が伸びたか
↓
GrowthStrategySnapshotを生成
↓
次回のMy-SNS生成へsoft guidanceとして返す
↓
必要に応じてSNS-AIもStrategy/Experimentへ利用
↓
繰り返す
```

重要なのは、以下の2種類の学習を混ぜないことです。

1. **Creator Preference**
   - Brand Profile
   - explicit human feedback
   - AI原案と人間承認版の差分
   - 「本人は何を好むか」

2. **Audience Performance**
   - 成熟した投稿Metrics
   - A/B Experiment
   - FeatureごとのLift / Confidence
   - 「何が最近このAudienceに効いたか」

Audience PerformanceはCreator Preferenceを上書きしてはいけません。

優先順位は原則として以下です。

```text
Safety / platform rules
> explicit creator instructions
> Brand Profile
> creator correction evidence
> audience performance evidence
> trend / exploration hints
```

---

# まず必ず読むファイル

この順番で読んでください。

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/CONTRACTS.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. `docs/CURSOR_AGENT_IMPLEMENTATION.md`
6. `.cursor/rules/sns-growth-bridge.mdc`

READMEや古いRoadmapより **現在のコード実装を優先**してください。

---

# 今回のタスク: Phase 0 Audit Only

現在の `main` branch を監査してください。

対象:

- `sunpotflower4460-cpu/My-SNS`
- `sunpotflower4460-cpu/SNS-AI`

最初にそれぞれの **正確なcommit SHA** を記録してください。

その後、以下3ファイルだけを `SNS-Growth-Bridge` に作成してください。

```text
docs/audit/MY_SNS_CURRENT_STATE.md
docs/audit/SNS_AI_CURRENT_STATE.md
docs/audit/MAPPING_MATRIX.md
```

このPhaseでは `packages/` を作らないでください。

---

# My-SNSで必ず確認するもの

## 1. Creator / Workspace identity

確認するもの:

- Workspace
- WorkspaceMember
- SocialAccount
- BrandProfile

Bridge側の `creatorId` / `workspaceId` / `accountId` とどう対応させられるかを記録してください。

推測は禁止です。

---

## 2. Content lineage

必ず以下を追ってください。

```text
Seed
→ SocialDraft
→ AI original snapshot
→ Human edit
→ Approval
→ DraftRevision
```

特に確認すること:

- AI原案はどこに保存されるか
- 人間承認版はどこに保存されるか
- AI案を修正せず承認した場合はどう扱われるか
- body/title/CTA/hashtags の差分判定
- `wasRevisionEditedByHuman` 相当の現在実装
- 次回生成用Few-shotへどこから渡されるか

Bridgeでは「承認しただけ」をHumanCorrectionとして扱ってはいけません。

---

## 3. Publication truth

以下を追ってください。

- PublishJob
- PublishAttempt
- publish worker
- manual / assisted / auto の違い
- external post ID
- external URL
- partial success
- ambiguous response
- retry
- duplicate-send prevention

Bridgeの `PublishedPostSnapshot` は、**My-SNS自身が投稿成功を確定しているものだけ**から作ります。

以下はPublished扱い禁止です。

- scheduled
- queued
- attempt started
- provider結果不明
- network timeoutだけで成功確認できない状態

---

## 4. Metrics / Analytics

現在の正確な実装を確認してください。

確認項目:

- DB table / repository / type
- providerごとのRaw Metrics
- post単位かaccount単位か
- checkpointの概念
- external post IDとのjoin方法
- X / Instagram / TikTok / YouTube等のCoverage
- views / impressions / reach / likes / shares / comments / saves / clicks / follows / watch metrics

Bridgeの `MetricSnapshot` に安全にMappingできないFieldがあれば、無理に対応せずBlockerにしてください。

---

## 5. AI generation context

現在My-SNSがDraft生成時に何をPromptへ渡しているか確認してください。

特に:

- Seed
- Brand Profile
- human correction examples
- channel-specific context
- assumptions

将来ここへ `GrowthStrategySnapshot` をsoft guidanceとして追加する予定です。

今回は変更しません。

---

# SNS-AIで必ず確認するもの

## 1. Performance scoring

最低でも以下を確認してください。

- `src/analytics/scorer.mjs`
- `metricVector()`
- baseline calculation
- relativeScore
- platform weights
- confidence

現在の挙動を正確に記録してください。

改善案があっても、このPhaseでは変更しません。

---

## 2. Strategy learning

最低でも確認:

- `src/learning/learn.mjs`
- `src/learning/features.mjs`
- strategy store
- mature checkpoint requirement
- strategy window
- minimum sample count
- preferred
- avoid
- exploreRate

現在のFeature Dimensions:

```text
topic
angle
hook
emotion
format
cta
mediaDecision
postingHour
```

これが現在どこから生成・保存・利用されるかを追ってください。

---

## 3. Human feedback

以下を確認してください。

- prefer
- avoid
- correct
- pin
- note

特に:

- pinned feedbackがrolling windowから落ちないか
- recent feedbackがどこでcandidate generationへ入るか
- performance learningとは別概念として保たれているか

---

## 4. Experiments

確認するもの:

- experiment definition
- assignment
- variant
- evaluation
- confidence
- strategyとの接続

Bridgeで共通化できるContractと、SNS-AI固有Runtimeを分けてください。

---

## 5. Manual-only safety posture

これは絶対に変更しないでください。

現在の以下を監査し、結果を記録してください。

- `config/runtime-policy.json`
- account enabled state
- engagement live accounts
- workflow trigger
- schedule / cronの有無
- automatic engagement
- scheduled provider polling
- automatic account activation

Current manual-only invariantsを壊す変更は禁止です。

---

# MAPPING_MATRIX.md の形式

最低でも以下の列を持つ表にしてください。

```text
| Canonical field | Source repo | Source path/type | Mapping | Confidence | Blocker |
```

Mapping状態は以下のどれかにしてください。

- `direct`
- `deterministically_derived`
- `optional_unavailable`
- `blocked`

例:

```text
| creatorId | My-SNS | Workspace.id | direct | high | none |
| MetricSnapshot.metrics.views | My-SNS | ... | blocked | n/a | provider metric schema not proven |
```

推測で `direct` にしないでください。

---

# Phase 0で必ず出す結論

最後に以下を明記してください。

```text
Can Phase 1 start? YES / NO
```

YESの場合:

- Phase 1で確定してよいContract
- まだOptional扱いにするField
- 注意点

NOの場合:

- Critical blocker
- 追加で確認すべきSource
- どのContractがまだ固定できないか

を列挙してください。

---

# このPhaseでやってはいけないこと

再掲します。

- Bridge package実装
- npm workspace作成
- Scoring port
- Strategy port
- Database追加
- API server追加
- OAuth追加
- My-SNS修正
- SNS-AI修正
- Provider API call
- SNS投稿
- SNS-AIのautomatic mode有効化
- Cron追加
- Secretコピー
- 本物のDMや個人情報をfixtureへ入れる

---

# 作業品質ルール

- 現在のmain branchの事実を優先する
- exact file pathを記録する
- exact commit SHAを記録する
- stale docsとの差分があれば記録する
- 不明点を推測しない
- Source of Truthを勝手にBridgeへ移さない
- Security/Safety boundaryを弱めない
- 1つの巨大PRにしない

---

# 完了報告フォーマット

作業終了時、必ず以下の形式で報告してください。

```text
Phase: Phase 0 Audit

Audited repositories:
- My-SNS: <commit SHA>
- SNS-AI: <commit SHA>

Files created:
- docs/audit/MY_SNS_CURRENT_STATE.md
- docs/audit/SNS_AI_CURRENT_STATE.md
- docs/audit/MAPPING_MATRIX.md

Key findings:
- ...

Critical blockers:
- ...

Behavior intentionally unchanged:
- My-SNS production behavior unchanged
- SNS-AI manual-only posture unchanged
- no provider side effects

Can Phase 1 start?: YES / NO

Recommended next action:
- ...
```

---

# Cursor Agentへ渡す短縮版プロンプト

以下をそのままCursor Agentへ貼り付けても構いません。

> `SNS-Growth-Bridge` の `CURSOR_AGENT_START_PROMPT_JA.md` を最初から最後まで読み、その指示に厳密に従ってください。あわせて `AGENTS.md`、`docs/ARCHITECTURE.md`、`docs/CONTRACTS.md`、`docs/IMPLEMENTATION_PLAN.md`、`docs/CURSOR_AGENT_IMPLEMENTATION.md`、`.cursor/rules/sns-growth-bridge.mdc` を順番に読んでください。今回は **Phase 0 Audit Only** です。`sunpotflower4460-cpu/My-SNS` と `sunpotflower4460-cpu/SNS-AI` の現在のmainを監査し、exact commit SHAを記録してください。`docs/audit/MY_SNS_CURRENT_STATE.md`、`docs/audit/SNS_AI_CURRENT_STATE.md`、`docs/audit/MAPPING_MATRIX.md` の3ファイルだけを作成してください。My-SNS/SNS-AIを変更せず、Bridge packagesもまだ実装しないでください。不明なMappingは推測せずblockerとして記録し、最後に `Can Phase 1 start?: YES / NO` を根拠付きで報告してください。
