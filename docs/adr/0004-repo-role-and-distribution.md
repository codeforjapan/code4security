# ADR 0004: このリポジトリは「配る側」とし、エージェント向けの機能は特定のエージェントに依存しない plugin として配る

## ステータス

提案中

## 日付

2026-10-16

## コンテキスト

実際の設定（`lefthook.yml`・`.github/workflows/*.yml`・`dependabot.yml`）と点検の結果（`.code4security/`）は、各プロジェクトのリポジトリに置かれる。このリポジトリに何を置き、どう配るかを決める必要がある。

v1（[ADR 0003](0003-v1-scope.md)）では、プロジェクトオーナーが手元の AI エージェントといっしょに点検から設定まで進める。エージェント向けの機能は、skill と MCP サーバーをまとめた plugin として配り、Claude や Claude Code に設定して使ってもらう想定である。一方で、プロジェクトとしては Codex や Cursor など、ほかのエージェントでも使えるようにしたい。

エージェントごとの違い:

- Agent Skills（`SKILL.md`）は公開された仕様で、Claude Code・Codex・Cursor などが対応している。ただし、Claude Code だけが読む frontmatter の欄を書くと、ほかのツールでは読み込みが失敗する
- MCP はエージェント共通のしくみだが、設定ファイルの場所と書き方はエージェントごとに違う
- Claude のチャット（claude.ai）では、plugin の skill は読み込まれるが、手元で動く MCP サーバーは無視される。リポジトリにも触れない

## 決定

### 1. このリポジトリの役割

このリポジトリは、プロジェクトに設定を入れるための材料と手順を配る。

| このリポジトリに置くもの | 各プロジェクトのリポジトリに置かれるもの |
|---|---|
| 項目データ・スキーマ・`checklist.json`（`guide/`） | なし（plugin に入れた版を読む） |
| plugin: skill・MCP サーバー・設定のひな形（`plugin/`） | ひな形から作った `lefthook.yml`・workflow・`dependabot.yml`、`.code4security/`（既定では `.gitignore` に入れる） |
| 参照される部品: checker の action（`checker/`） | `uses: codeforjapan/code4security/checker@<sha>` を書いた、数行の呼び出し側の workflow |
| ADR・ロードマップ・導入手順書（`docs/`） | なし |

このリポジトリ自体の lefthook や Actions は、このリポジトリを守るための設定で、上の表とは別に扱う（[ADR 0008](0008-repo-defense.md)）。

### 2. 設定は「写す」を基本にし、ロジックを持つ部品だけ「参照させる」

- **写す**: lefthook・CodeQL・zizmor・Dependabot の設定。エージェントがひな形をもとに、プロジェクトに合わせて書く。オーナーが中身を読める長さに保つ
- **参照させる**: checker の action だけ。コミットの SHA で固定してもらい、更新は Dependabot で届ける

### 3. plugin の構成

```
.claude-plugin/marketplace.json   # このリポジトリをマーケットプレイスにする
plugin/
  .claude-plugin/plugin.json
  .mcp.json
  skills/                         # checkup・threat-model・routine・setup-item
  server/                         # MCP サーバー
  data/                           # guide/ からビルドした checklist.json と JSON Schema
  templates/                      # 設定のひな形
```

### 4. 特定のエージェントに依存しない

- **中身はエージェントに依存させない**: skill の本文と MCP サーバーには、特定のエージェントでしか動かない書き方をしない
- **skill の frontmatter は、Agent Skills の仕様にある欄（`name`・`description`・`license`・`compatibility`・`metadata`・`allowed-tools`）だけにする**
- **Claude Code だけの機能（hooks・subagents・commands）は使わない**。git の hook は lefthook で、操作の入り口は skill で足りる
- **エージェントごとの違いは「包装」に閉じ込める**: `plugin.json`・`marketplace.json`・`.mcp.json` は Claude 向けの包装として置く。ほかのエージェントには、skill の置き場所と MCP サーバーの設定方法を導入手順書で案内する
- **MCP サーバーは単体でも動かせるようにする**: plugin の外からも、版を固定したコマンドで起動できる形にする（配り方は [ADR 0001](0001-implementation-language.md) の言語に合わせて決める）
- **承認はエージェントの機能に頼らない**: ファイルの変更やコマンドの実行の前に、差分やコマンドをオーナーに見せて承認をもらう、と skill の本文に書く

### 5. 対応する場所と、できること

| | 点検・脅威モデル | ルーチンの提案 | 設定・確かめる |
|---|---|---|---|
| Claude Code | ○ | ○ | ○ |
| Codex・Cursor など | ○ | ○ | ○（MCP サーバーを自分で設定する） |
| Claude のチャット | ○（聞き取りだけ） | ○ | 手順を文章で渡す |

v1 は Claude Code で最後まで動くことを確かめる。ほかのエージェントでは、イベントまでに少なくとも 1 つで試す。

### 6. リモートの MCP サーバーは作らない

CfJ がサーバーを運営すると、利用者の「まだ対策していない穴」の情報がそこに集まる。v1 では手元で動く MCP サーバーだけにする。

## 根拠

- 実際の設定を持つのはプロジェクトのリポジトリなので、このリポジトリは「材料と手順を配る」役に絞ると、何をどこで直すかが分かりやすい
- 短い設定は、写したほうがオーナーが読めて、このリポジトリへの依存も増えない。checker は中身が大きく、直したときに全員へ届けたいので、参照させる
- plugin は Claude Code で入れて更新するのが簡単で、v1 のイベントで導入の手間を減らせる
- skill と MCP はどちらもエージェント共通のしくみなので、Claude だけの機能を避ければ、中身を書き直さずにほかのエージェントでも使える
- 弱点の情報を CfJ が預からなければ、守るべきものと運営の手間が増えない

## 影響

### メリット

- 参加者が普段使っているエージェントで、そのまま使える
- 項目データ・ひな形・skill を、それぞれ小さな PR で直せる

### 懸念点

- Claude Code の `disable-model-invocation` が使えず、設定を変える skill（setup-item）が、オーナーの意図しない場面で呼ばれるおそれがある
  - 緩和策: `description` で使う場面をはっきり書き、本文で「変更の前に必ず承認をもらう」と決める。エージェント側の権限の確認も残る
- エージェントごとに、承認の求め方や MCP の扱いが違い、結果がぶれる
  - 緩和策: 済んだかの判断は MCP の `verify` で決まった形にする。イベントの前に、対応する場所ごとに最後まで試す
- `claude plugin eval` のような試験の道具は Claude Code にしかない
  - 緩和策: skill の試験の手順は、エージェントに依存しない形（入力のリポジトリと、期待する `project.yml`）で書き、Claude Code では eval を使う
- ほかのエージェントでは、MCP サーバーを利用者が自分で設定する手間がある
  - 緩和策: 導入手順書に、エージェントごとの設定例を載せる
- plugin を入れた利用者の PC で、このリポジトリのコードが動く。このリポジトリが改ざんされると、利用者全員に広がる
  - 緩和策: [ADR 0008](0008-repo-defense.md) で扱う

## 代替案

- **Claude Code の機能を使い切る**（hooks・subagents・`disable-model-invocation` など）: Claude Code での体験はよくなる。一方で、ほかのエージェントでは読み込みが失敗するか、別の版を持つことになる
- **エージェントごとに別の包装と本文を持つ**: それぞれで最適にできる。一方で、直す場所が増え、内容がずれていく
- **設定をすべて参照させる**（reusable workflow・lefthook の remotes）: 更新が全員に届く。一方で、このリポジトリへの依存と、改ざんされたときの影響が大きくなる。短い設定ではオーナーが中身を読まなくなる

## 今後の方向性

- 承認されたら、[ADR 0003](0003-v1-scope.md) の「v1 に含めるもの」の配置（`agent/`・`kit/`）を、修正履歴で `plugin/` に直す
- 写した設定の更新を届ける方法（skill で「ひな形との差分を確かめる」など）を検討する
- 見直すきっかけ: Agent Skills の仕様に、承認や呼び出しの制御の欄が入ったとき

## 参考

- [Agent Skills の仕様](https://agentskills.io/specification)
- [Claude Code: plugin の構成](https://code.claude.com/docs/en/plugins/components.md)
- [Claude Code: マーケットプレイスの作り方](https://code.claude.com/docs/en/plugins/create-marketplace.md)
- [Claude の plugin の対応範囲](https://claude.com/docs/plugins/platform-support)
- [ADR 0001: 実装の言語](0001-implementation-language.md)
- [ADR 0003: v1 の範囲](0003-v1-scope.md)
- [ADR 0008: このリポジトリの防御](0008-repo-defense.md)
