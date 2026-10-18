# ADR 0009: 脅威モデルは軽い形で始め、CyberRiskScape とつなげられるようにする

## ステータス

提案中
<!-- CyberRiskScape の作者（takashi-ohmoto-git さん）との相談はまだ。連携の形は相談のうえで決める -->

## 日付

2026-10-16

## コンテキスト

v1（[ADR 0003](0003-v1-scope.md)）の 2 段階目では、点検表から脅威モデルを作る。今の案（[ADR 0005](0005-schema-v2-and-project-state.md)）は、`threats.yml` に平易な文の脅威の一覧を持ち、「条件 → 守るもの」「項目 → 防いでいる脅威」から `threat-model.md` を組み立てる、自前の軽い仕組みである。

これとは別に、[CyberRiskScape](https://github.com/takashi-ohmoto-git/CyberRiskScape) という OSS がある。2026-10-16 時点で調べた内容は次のとおり。

| 観点 | 内容 |
|---|---|
| 何をするか | ブラウザでシステム構成図（DFD）を描くと、構成に応じた脅威を自動で列挙する。サーバー不要で、設計データを外に送らない |
| 脅威ルール | 224 件（STRIDE 149・AI 33・AgenticAI 42）。YAML で 1 ファイルに複数のルールを書き、出典（OWASP・MITRE・NIST・IPA など）を付けている |
| エージェントとの連携 | stdio の MCP サーバーを持つ（Claude Code・Copilot・Cursor の設定例あり）。エージェントは脅威の問い合わせと構成図の更新ができ、受容やリスク評価など人の判断に属するものは変えられない |
| CI | 構成図の 2 つの版を比べ、新しく増えた脅威と、見直しのきっかけ（T1〜T8: 新しい信頼境界、新しい外部連携など）を PR に出す。SARIF にも書き出す |
| チェックリスト | 注意喚起の対策（同梱は IPA 注意喚起 2026-10-09 の 17 項目）を構成図に当てはめ、項目ごとに「要対応・未入力・リスク受容・問題なし・対象なし」を出す |
| 書き出し | 脅威一覧を CSV・JSON と、Anthropic の `defending-code-reference-harness` が使う `THREAT_MODEL.md` と同じ構造の Markdown で書き出す（作者の説明による） |
| 技術 | TypeScript・Zod・YAML・React。Apache License 2.0 |
| 成熟度 | 2026-08-26 に始まり、コミットは 167 件で、すべて作者 1 人によるもの。v0.6.0。npm には公開しておらず、使うには clone してビルドする |
| 想定する利用者 | ID 基盤・API ゲートウェイ・車載・PQC なども扱い、企業のシステムまで対象にしている |

## 決定

1. **v1 の脅威モデルは、自前の軽い仕組みのまま作る**（ADR 0005 の `threats.yml` と `threat-model.md`）。構成図を描かなくても、点検表の答えから作れることを優先する
2. **`threat-model.md` の構造を、CyberRiskScape が書き出す `THREAT_MODEL.md` の構造に合わせる**（System context・Assets・Entry points & trust boundaries・Threats・Deprioritized・Open questions・Provenance・Recommended mitigations）。脅威表の `status` の値（`mitigated`・`partially_mitigated`・`risk_accepted`・`unmitigated`）も合わせる
3. **項目の状態の呼び方を、CyberRiskScape のチェックリストに近づける**。`project.yml` の状態（済み・未着手・対象外・リスクを受け入れる）と、その対応表を ADR 0005 に足す
4. **構成が込み入ったプロジェクトには、CyberRiskScape を「次の段階」として案内する**。目安は、AI エージェントや LLM を組み込んでいる、外部のサービスとの連携が多い、など。plugin の skill から案内し、v1 では plugin に CyberRiskScape を組み込まない
5. 作者に連絡し、連携の形（項目と脅威ルールの対応づけ、npm での公開など）を相談する

## 根拠

- **対象の利用者に合う重さ**: このプロジェクトの利用者は、少人数のシビックテックや個人開発者で、エンジニアでない人もいる。v1 の目標は 1 日で基本の守りを入れることで、構成図を描く手間は大きい。224 件のルールは、小さなプロジェクトには多すぎる
- **書き出しの形を合わせる費用は小さく、効果が大きい**: 見出しと列を合わせるだけで、利用者が後から CyberRiskScape に移っても、AI による脆弱性診断の入力にしても、同じ形で読める
- **組み込むと配布と守りの負担が増える**: CyberRiskScape は npm に公開されておらず、plugin に入れるには取り込んでビルドするか、利用者に clone してもらう必要がある。plugin の依存が増えるほど、[ADR 0008](0008-repo-defense.md) の守るべき面も広がる
- **作者が 1 人で、始まって 2 か月**: 中心に据えると、変更の速さや方針の変化をそのまま受けることになる。案内と書き出しの形で緩くつなぐほうが、両方のプロジェクトにとって無理がない
- **考え方は近い**: エージェントに人の判断を変えさせない、外に通信しない、IPA の注意喚起を項目に落とす、といった方針は、このプロジェクトと同じ方向を向いている

## 影響

### メリット

- v1 の脅威モデルを、構成図なしで作れる
- 書き出した `threat-model.md` を、CyberRiskScape や AI による脆弱性診断にそのまま渡せる
- 構成が込み入ったプロジェクトは、豊富な脅威ルールを持つ道具に進める

### 懸念点

- 自前の `threats.yml` の脅威の一覧が、CyberRiskScape のルールと重なって、2 か所で育つ
  - 緩和策: `threats.yml` は数十件までの平易な一覧にとどめる。細かい脅威は CyberRiskScape に任せる。将来、`threats.yml` の各脅威に、対応する CyberRiskScape の `canonicalId` を書けるようにする
- `THREAT_MODEL.md` の構造は他のプロジェクトの取り決めで、変わる可能性がある
  - 緩和策: どの版に合わせたかを `threat-model.md` の Provenance に書く。変わったときは CyberRiskScape の書き出しを参考に追いかける
- 「次の段階」として案内しても、移る手順がなければ使われない
  - 緩和策: 作者と相談し、`project.yml` の条件から CyberRiskScape の構成図の下書きを作れるかを検討する（CyberRiskScape の MCP サーバーは構成図の更新を受け付ける）

## 代替案

- **CyberRiskScape を脅威モデルの中心に据える**: エージェントが CyberRiskScape の MCP サーバーで構成図を作り、脅威を列挙して書き出す。脅威ルールが豊富で、出典もそろい、CI の差分ゲートも使える。一方で、小さなプロジェクトには重く、npm に公開されていないため配布が難しく、作者 1 人のプロジェクトに v1 の中心を預けることになる。v1 では採らず、連携が進んだら見直す
- **CyberRiskScape の脅威ルールだけを取り込む**: Apache License 2.0 なので、帰属表示をすれば使える。一方で、ルールは構成図のノードと接続を前提に書かれていて、点検表の条件からはそのまま使えない
- **CyberRiskScape とつながず、自前の形式で書き出す**: 自由に決められる。一方で、利用者が別の道具に移るときに書き直しが要る

## 今後の方向性

- 作者に連絡し、このプロジェクトの紹介と連携の相談をする
- ADR 0005 に、`threat-model.md` の構造と、状態の対応表を足す
- 見直すきっかけ: CyberRiskScape が npm で公開されたとき。コントリビューターが増えたとき。v1 のイベントで、構成図を描きたいという声が多かったとき
- CyberRiskScape の CI の差分ゲート（構成が変わったら脅威モデルを見直す）を、ルーチンの項目として扱えるかを検討する

## 参考

- [CyberRiskScape](https://github.com/takashi-ohmoto-git/CyberRiskScape)
- [CyberRiskScape: 脅威モデルを AI が読める Security Context に変換する](https://github.com/takashi-ohmoto-git/CyberRiskScape/blob/main/guide/security-context.ja.md)
- [CyberRiskScape: コーディングエージェントから使う](https://github.com/takashi-ohmoto-git/CyberRiskScape/blob/main/guide/mcp-integration.ja.md)
- [ADR 0003: v1 の範囲](0003-v1-scope.md)
- [ADR 0005: スキーマ v2 と、利用者側に残すファイル](0005-schema-v2-and-project-state.md)
- [ADR 0008: このリポジトリの防御](0008-repo-defense.md)
