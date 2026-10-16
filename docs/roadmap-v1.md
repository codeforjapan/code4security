# v1 までの進め方（〜2026-12-12）

v1 の範囲は [ADR 0003](adr/0003-v1-scope.md)、このリポジトリの役割と配り方は [ADR 0004](adr/0004-repo-role-and-distribution.md) を見てください。

## リポジトリの構成（v1）

```
guide/     項目データ（YAML）・スキーマ・書き出し（first-security-checkup から）
checker/   毎週の横断チェックの action（weekly-security-checker から）
plugin/    エージェント向けの plugin: skill・MCP サーバー・設定のひな形・ビルドした checklist.json
docs/      ADR・導入手順書
.claude-plugin/marketplace.json
```

実際の設定（`lefthook.yml`・workflow など）は、各プロジェクトのリポジトリに置かれる。このリポジトリは材料と手順を配る。

各部分は、項目 ID と `checklist.json` の `schema_version` だけでつながる。お互いの完成を待たずに進められる。

## 進める順番

### Phase 0: 土台（〜10/31） — コアメンバー

全体を止めてしまう作業だけを先に終える。

- [ ] 実装の言語について、コミュニティから意見を集めて決める（ADR 0001、10/24 目安）
- [ ] yokinist さんに、取り込みの許可と、TypeScript への書き直しについて相談する（ADR 0001・0002）
- [ ] 許可をもらったら、2 つのリポジトリを履歴を残して取り込む（ADR 0002）
- [ ] このリポジトリの役割と plugin での配り方を決める（ADR 0004）
- [ ] スキーマ v2 を決める（ADR 0005）。スキーマ定義の道具を決め、`export.js` の確認を置き換え、JSON Schema を書き出す（ADR 0006）
- [ ] checker の起動ルートを決める（ADR 0007）
- [ ] このリポジトリの守りの最低限: ruleset・2FA・既定の `permissions`・CODEOWNERS・private vulnerability reporting（ADR 0008）
- [ ] CONTRIBUTING をリポジトリ全体向けに直す。部分ごとの入り口と、Issue テンプレ（項目の提案・ひな形の提案・ADR の提案）を作る
- [ ] ラベル: `area:guide` `area:plugin` `area:checker` `area:security` `good first issue` `cfj-internal`

### Phase 1: 並行して作る（11/1〜11/21）

| 部分 | やること | 担当 |
|---|---|---|
| plugin | skill の骨組み: リポジトリを調べる → 条件を決める → 項目の状態を決める → `project.yml` と `threat-model.md` を書く | コア |
| plugin | MCP サーバー: 条件の推測・項目の抽出・`project.yml` の読み書き | コア |
| plugin | 設定のひな形（1 ひな形 1 PR、外部の action は SHA で固定） | コミュニティ |
| guide | `conditions.yml` に `detect` / `ask` を足す | コミュニティ |
| guide | level 1 の項目から順に `verify` / `setup` / `routine` / `threats` を足す（1 項目 1 PR） | コミュニティ（good first issue） |
| guide | `threats.yml` の最初の版 | コア＋レビュー |
| guide | GitHub 以外の項目（Slack・Google Workspace・Notion・ドメイン） | CfJ（`cfj-internal`） |
| checker | 書き直し（ADR 0001 で決まった場合）と、確かめる処理を MCP サーバーと分け合える形にする（ADR 0007） | コア＋yokinist さん |
| checker | 検知を項目 ID に対応づけ、Issue から項目の `why` / `how` に案内する | コミュニティ |
| security | ADR 0008 の表の各行を Issue にして対策する | コア |

### Phase 2: 仕上げと試運転（11/22〜12/5）

- [ ] plugin: ルーチンを一覧にする skill と、項目ごとに設定する skill（`setup` → MCP の `verify`）
- [ ] plugin: Claude Code で最後まで通す。Codex か Cursor の少なくとも 1 つで、skill と MCP サーバーを設定して試す
- [ ] CfJ のプロジェクト 2〜3 個で、最初から最後まで通す。かかった時間を測る（イベントの指標の基準になる）
- [ ] このリポジトリ自体に plugin を当てはめる
- [ ] 導入手順書（日本語、エージェントごとの設定例つき）

### Phase 3: 公開（12/6〜12/12）

- [ ] 12/6 にコードの変更を止め、直すのは不具合だけにする。v1 のタグを打ち、保護する
- [ ] イベント当日の進め方と、詰まったときの相談先。当日の PR のレビューの体制

### v1 のあと

- Viewer の作り直し（`project.yml` を読み込んで表示するなど）
- 他人の OSS を見て回る取り組みと、修正への報酬（方針を作ってから）

## 非同期で進めるための決まり

- 決めたことは ADR に残す（書き方は [AGENTS.md](../AGENTS.md)）。Slack で決まった結論も、リポジトリに戻す
- 推奨を変える PR（ツールの差し替え・優先度の変更）と、守るべきパス（ADR 0008）の変更は、コアメンバーのレビューを必須にする。リンクの修正や版の更新などの機械的な変更は、確認が通ればマージしてよい
- 項目の `evidence.checked` が古くなったものは、定期的に Issue にする
