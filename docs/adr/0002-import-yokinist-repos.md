# ADR 0002: first-security-checkup と weekly-security-checker を本体に取り込む

## ステータス

承認済み

## 日付

2026-10-16

## 決定の記録

- 議論した場所: [PR #1](https://github.com/codeforjapan/code4security/pull/1)、取り込みの作業は [#17](https://github.com/codeforjapan/code4security/issues/17)・[#18](https://github.com/codeforjapan/code4security/issues/18)。yokinist さんの許可は、本人がこの ADR を承認済みにする PR を出したことで示す
- 決定の場: この ADR を承認済みにする PR のレビュー
- 承認者: 未定（レビューのあとに書く）
- 承認日: 未定

## コンテキスト

yokinist さんが、本プロジェクトに還元する前提で次の 2 つを作った。

- [first-security-checkup](https://github.com/yokinist/first-security-checkup): 点検項目を YAML（1 項目 1 ファイル）で管理し、CI で型を確かめ、`checklist.json`・`checklist.md`・`llms.txt` を書き出す点検表
- [weekly-security-checker](https://github.com/yokinist/weekly-security-checker): アカウントや organization のリポジトリを横断して毎週調べ、非公開リポジトリに Issue を起票する GitHub Action

v1（[ADR 0003](0003-v1-scope.md)）は、この 2 つを土台にする。別リポジトリのまま連携すると、項目 ID・スキーマの版・リリースを 2 か所で合わせ続けることになる。

## 決定

yokinist さんの許可をもらったうえで、両方を `codeforjapan/code4security` に取り込み、ここを正とする。

- コミット履歴を残して取り込む（`git merge --allow-unrelated-histories` でサブディレクトリへ）
- 配置: `guide/`（first-security-checkup）、`checker/`（weekly-security-checker）
- ライセンスは元のまま引き継ぐ: コードは MIT、`guide/data/` などの文章とデータは CC BY 4.0
  - 元の著作者の表示を残すために、`guide/LICENSE`・`guide/LICENSE-CONTENT.md`・`checker/LICENSE` を消さずに置く。リポジトリ全体のライセンスと、パスごとの一覧は [ADR 0011](0011-license.md) で決める
  - `guide/LICENSE-CONTENT.md` にある出典の示し方の URL は、取り込み先（`https://github.com/codeforjapan/code4security/tree/main/guide`）に直す（取り込みの PR で行う）。題名の「はじめてのセキュリティ点検」は変えない
- weekly-security-checker は Python のまま取り込み、TypeScript へはそのあとの PR で小さく分けて移す（[#7](https://github.com/codeforjapan/code4security/issues/7)、[ADR 0001](0001-implementation-language.md)）
- 元リポジトリは、README で移転先を案内してからアーカイブする。点検表のページ（`https://yokinist.github.io/first-security-checkup/`）は、このリポジトリから公開できるようになるまで残す

## 根拠

- 項目 ID が、点検表・checker・エージェント向けの手順の共通のキーになる。1 つのリポジトリにあれば、ID やスキーマの変更を 1 つの PR で全体に反映できる
- コントリビューターが出す PR の先が 1 か所になり、Issue・ラベル・レビューの運用も 1 つにまとまる
- 履歴を残せば、作者の記録と、各項目がなぜその書き方になったかの経緯が残る

## 影響

### メリット

- スキーマの変更と、それを使う側（checker・agent）の修正を同時にマージできる
- v1 のリリースを 1 つのタグで管理できる

### 懸念点

- 作者の意向と合わない形で取り込んでしまう
  - 緩和策: 取り込みの前に yokinist さんの許可をもらい、配置・ライセンスの表記・元リポジトリの扱い・TypeScript への書き直しをいっしょに決める
- 元リポジトリの checker（`uses: yokinist/weekly-security-checker@...`）を使い始める人がいるかもしれない。2026-10-22 の時点で、公開リポジトリで使っているところは見つからず、作者も非公開のリポジトリで使っていない
  - 緩和策: 元リポジトリの README で移転先を案内する。元のタグ（v0.1.0・v0.1.1）は消さず、アーカイブしたあとも呼べるようにしておく
- リポジトリが大きくなり、変更が関係のない部分の CI まで動かす
  - 緩和策: ワークフローを `paths` で部分ごとに分ける

## 代替案

- **別リポジトリのまま連携する**: 作者が自分のペースで進められる。一方で、項目 ID と `schema_version` を複数のリポジトリで合わせ続ける必要があり、v1 までの短い期間には合わない
- **履歴を残さずにファイルだけ写す**: 手間は少ない。作者の記録と経緯が失われるので採らない

## 今後の方向性

- 取り込みは 1 つの PR で行い、マージは履歴が残る「Create a merge commit」で行う（Squash では元の履歴が消える）
- checker は `checker/action.yml` に置き、`uses: codeforjapan/code4security/checker@<sha>` で呼べるようにする
- 点検表のページをこのリポジトリの GitHub Pages から公開し、`guide/` と `checker/` の中にある元リポジトリへのリンクを付け替える。公開の設定にはリポジトリの管理者の操作が要る
- 取り込んだ `guide/CONTRIBUTING.md`・`guide/SECURITY.md`・`checker/SECURITY.md`・`guide/.github/pull_request_template.md` を、リポジトリ直下の文書とまとめる

## 参考

- [ADR 0001: 実装の言語](0001-implementation-language.md)
- [ADR 0003: v1 の範囲](0003-v1-scope.md)
- [ADR 0005: スキーマ v2 と、利用者側に残すファイル](0005-schema-v2-and-project-state.md)
- [ADR 0011: ライセンス](0011-license.md)
