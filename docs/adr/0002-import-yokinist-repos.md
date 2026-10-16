# ADR 0002: first-security-checkup と weekly-security-checker を本体に取り込む

## ステータス

提案中
<!-- yokinist さんの許可をもらってから承認済みにし、取り込みを実行する -->

## 日付

2026-10-16

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
- 実装の言語をそろえるために、weekly-security-checker を TypeScript で書き直すかどうかは [ADR 0001](0001-implementation-language.md) で決める。書き直す場合も、取り込みは履歴を残して行い、書き直しはそのあとの PR にする
- 元リポジトリの扱い（移転先の案内・アーカイブ）は yokinist さんと決める

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
- 元リポジトリの checker（`uses: yokinist/weekly-security-checker@...`）をすでに使っている人がいる
  - 緩和策: 元リポジトリの README で移転先を案内し、一定期間は元のタグを残す
- リポジトリが大きくなり、変更が関係のない部分の CI まで動かす
  - 緩和策: ワークフローを `paths` で部分ごとに分ける

## 代替案

- **別リポジトリのまま連携する**: 作者が自分のペースで進められる。一方で、項目 ID と `schema_version` を複数のリポジトリで合わせ続ける必要があり、v1 までの短い期間には合わない
- **履歴を残さずにファイルだけ写す**: 手間は少ない。作者の記録と経緯が失われるので採らない

## 今後の方向性

- 許可をもらったら、取り込みを 1 つの PR で行い、このステータスを承認済みにする
- checker を `uses: codeforjapan/code4security/checker@<sha>` で呼べるよう、`action.yml` の置き場所を合わせる

## 参考

- [ADR 0001: 実装の言語](0001-implementation-language.md)
- [ADR 0003: v1 の範囲](0003-v1-scope.md)
- [ADR 0005: スキーマ v2 と、利用者側に残すファイル](0005-schema-v2-and-project-state.md)
