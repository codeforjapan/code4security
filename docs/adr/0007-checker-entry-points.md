# ADR 0007: checker の確認を 1 つにまとめ、起動ルートごとに動かす範囲を分ける

## ステータス

提案中

## 日付

2026-10-16

## コンテキスト

点検を回し続ける方法は、いくつも考えられる。

- **lefthook**（コミット時・push 時）: 開発者の手元で毎回動く
- **GitHub Actions の PR 時の確認**: リポジトリごとに、変更のたびに動く
- **GitHub Actions の定期実行**: 今の weekly-security-checker。アカウントや organization のリポジトリを横断して調べ、非公開リポジトリに Issue を起票する
- **コーディングエージェント**: オーナーが頼んだときに、手元で調べる。v1 の「設定 → 確かめる」（[ADR 0003](0003-v1-scope.md)）で使う

それぞれで、使える権限・かけられる時間・コードを実行してよいかが違う。起動ルートごとに別々の確認を作ると、同じ項目の確かめ方が何か所にも分かれる。

なお、今の checker（`scan.py`）は `python3 scan.py <owner | owner/repo> [--dry-run]` として手元でも動く。対象のコードは実行しない方針をとっている。

## 決定

### 1. 「ツールを動かすこと」と「点検が続いているか確かめること」を分ける

- **ルーチンのツール**（Gitleaks・CodeQL・zizmor など）は、plugin の設定のひな形（`plugin/templates/`、[ADR 0004](0004-repo-role-and-distribution.md)）をもとに、プロジェクトの lefthook や Actions に直接組み込む。checker を通さない
- **checker** は、項目の `title` に書いた「対策が済んだ状態」が今も保たれているかを、項目の `verify`（[ADR 0005](0005-schema-v2-and-project-state.md)）と既存の検知で確かめる。確かめるのは次の 2 つ
  - **状態が保たれているか**: 設定が外れていないか（Dependabot が無効になっていない、など）、見つかったものが放置されていないか（未対応のアラートが残っていない、など）
  - **ルーチンの項目では、仕組みが動き続けているか**: 設定ファイルがあるだけでなく、実際に動いて成功しているか（CodeQL の workflow が最近成功している、など）。`verify` に `gh-api` で最後の実行の結果を確かめる手順を書く。lefthook のように手元でしか動かないものは、定期実行からは確かめられないので、手元のルートで `.git/hooks` に組み込まれているかを確かめる

lefthook と PR 時の確認は「ルーチンのツール」の置き場で、checker の起動ルートにはしない。

### 2. checker の起動ルートは 2 つにする

| | 定期実行（Actions） | 手元（plugin の MCP サーバー） |
|---|---|---|
| 対象 | アカウント・organization を横断 | 今いるリポジトリ（`.`） |
| `verify: file` | ○（clone して読むだけ） | ○ |
| `verify: gh-api` | ○ | ○（`gh` の認証を使う） |
| `verify: command` | ×（対象のコードを実行しない） | ○（オーナーに見せて承認をもらってから） |
| `verify: ask` | × | ○（エージェントがオーナーに聞く） |
| 結果の出し先 | 非公開リポジトリの Issue | JSON（エージェントが `project.yml` を更新する）と、人向けの表示 |

定期実行の列は、checker を TypeScript に移し終えたあとの形。それまでは、定期実行の checker は今の検知のまま動き、`verify` は使わない（[ADR 0001](0001-implementation-language.md)）。

### 3. 結果の形を 1 つにそろえる

どちらの起動ルートも、項目 ID ごとに `pass` / `fail` / `unknown`（調べられなかった）と根拠を返す。Issue の起票と `project.yml` の更新は、この結果を受け取る側の仕事にする。

### 4. 手元のルートは、plugin の MCP サーバーのツールにする

手元で確かめる入り口は、CLI ではなく MCP サーバーのツール（例: `verify_item`・`verify_all`）にする。`verify` を実行する処理は、定期実行の checker と同じものを使う（[ADR 0001](0001-implementation-language.md)）。ただし、checker を TypeScript に移し終えるまでは、MCP サーバーだけが使う。

## 根拠

- lefthook には速さ、PR 時の確認には変更点への絞り込みが求められる。どちらも Gitleaks や zizmor を直接動かすのがいちばん速く、確かでもある。checker を挟む利点はない
- 横断の定期実行は、他人が書いたコードも読む。コードを実行しない今の方針を守るべきで、`command` は動かさない
- 手元では、オーナーがその場にいて承認できる。エージェントが `command` と `ask` を使えるのはここだけ
- 確かめ方の定義を項目データの `verify` に置けば、起動ルートが増えても確認を書き直さずに済む
- 将来は、ソフトウェア開発だけでなく、Slack や Google Drive の共有設定などの一般の業務の点検にも広げたい。そうした点検をするのは、コーディングエージェントを使わない人も多い。CLI はシェルを動かせるコーディングエージェントでしか使えないが、MCP は Claude のデスクトップアプリ（Cowork）など、コーディングエージェント以外からも呼べる
- エージェントは MCP のツールを呼ぶだけで済み、エージェントごとにコマンドの組み立て方がぶれない。CLI を別に作らないので、[ADR 0003](0003-v1-scope.md) の「CLI は v1 で作らない」とも合う

## 影響

### メリット

- 同じ項目を、定期実行でも手元でも同じ基準で判断できる
- エージェントが設定したあとの確認と、毎週の確認の結果が食い違わない
- 起動ルートごとの安全の範囲（コードを実行するか）が表で明確になる

### 懸念点

- checker の処理を、定期実行と MCP サーバーの両方から使える形に分ける変更が要る
  - 緩和策: 今の出力（Issue の本文）は残し、確かめる処理と出し先を分ける。取り込み（[ADR 0002](0002-import-yokinist-repos.md)）と、言語の決定（[ADR 0001](0001-implementation-language.md)）のあとに行う
- MCP のツールを通して、利用者の PC でコマンドが動く
  - 緩和策: `command` は読み取りだけのものに限り、実行の前にオーナーに見せる（[ADR 0008](0008-repo-defense.md)）
- 定期実行では `command` を動かさないので、`unknown` のまま残る項目がある
  - 緩和策: `unknown` の項目は Issue にせず、手元で確かめるよう案内する

## 代替案

- **lefthook・PR 時・定期実行・手元のそれぞれに、checker の入り口を作る**: どこでも同じ確認が動く。一方で、lefthook が遅くなり、PR 時の確認が CodeQL などと重なる。作る量に見合わない
- **定期実行だけにし、手元の確認はエージェントに任せる**: 作る量は最小になる。一方で、エージェントごとに確かめ方がぶれ、毎週の結果と食い違う
- **定期実行でも `command` を動かす**: 確かめられる項目が増える。一方で、他人のコードを実行する危険があり、今の安全の方針を崩すので採らない

## 今後の方向性

- 自分の organization だけを対象にする場合に限り、定期実行で `command` を許すかを検討する
- PR 時に、変更が項目を外していないか（例: `permissions` の削除）を確かめる需要が出てきたら、3 つ目の起動ルートとして検討する
- 一般の業務の点検（Slack・Google Drive など）に広げるときは、同じ MCP サーバーにツールを足す。Claude のチャットのように手元の MCP サーバーを使えない場所にも対応するなら、リモートの MCP サーバーを作らない方針（[ADR 0004](0004-repo-role-and-distribution.md)）を見直す
- 人が MCP を使わずに手元で確かめたい需要が出てきたら、同じ処理を呼ぶ CLI を検討する

## 参考

- [weekly-security-checker](https://github.com/yokinist/weekly-security-checker)
- [lefthook](https://github.com/evilmartians/lefthook)
- [ADR 0001: 実装の言語](0001-implementation-language.md)
- [ADR 0003: v1 の範囲](0003-v1-scope.md)
- [ADR 0004: このリポジトリの役割と、plugin での配り方](0004-repo-role-and-distribution.md)
- [ADR 0005: スキーマ v2 と、利用者側に残すファイル](0005-schema-v2-and-project-state.md)
- [ADR 0008: このリポジトリの防御](0008-repo-defense.md)
