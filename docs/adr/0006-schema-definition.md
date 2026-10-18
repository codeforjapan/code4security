# ADR 0006: 項目データは YAML で書き、スキーマは Zod で定義して JSON Schema を書き出す

## ステータス

提案中

## 日付

2026-10-16

## コンテキスト

first-security-checkup では、項目データを YAML で書き、`export.js` の手書きの確認（使える欄の一覧、必須の欄、ID の参照など）で型を確かめている。

スキーマ v2（[ADR 0005](0005-schema-v2-and-project-state.md)）では欄が増え、`verify` のように入れ子で、種類によって形が変わる欄も入る。今後も欄の追加や変更が続く。

項目データを使う側は 1 つの言語にそろっていない。

- `guide/`: Node.js（書き出し）
- `checker/`: Python（TypeScript に書き直す案を [ADR 0001](0001-implementation-language.md) で検討している）
- `plugin/`: MCP サーバーと skill。エージェントが JSON と説明文を読む
- 項目を書く人: エンジニアだけでなく、文章を直す人もいる

## 決定

書く形式とスキーマの定義を分けて考える。

- **書く形式は YAML のまま**にする（1 項目 1 ファイル）
- **スキーマは Zod で定義**し（`guide/schema/*.ts`）、これを唯一の定義にする。`export.js` の手書きの確認は、Zod の確認に置き換える
- Zod の定義から **JSON Schema を書き出し**、`checklist.json` といっしょに配る（`checklist.schema.json`）
  - checker（Python）は、JSON Schema で `checklist.json` を確かめる
  - エディタは、YAML の先頭に `# yaml-language-server: $schema=...` を書けば、補完と誤りの表示が出る
  - エージェントには、欄の説明（`.describe()`）を JSON Schema ごと渡す
- ID の参照（`when` が `conditions.yml` にあるか、など）のように、ファイルをまたぐ確認は、Zod の `superRefine` か、確認の段階を別に作って書く

## 根拠

- 「YAML か Zod か」は、どちらかを選ぶ話ではない。YAML は書く形式、Zod はその形を定義する道具で、両方使える
- YAML は、コメントを書けて、差分が読みやすく、エンジニアでない人も直せる。項目を書く人の入りやすさは、このプロジェクトの価値にそのまま効く
- 手書きの確認は、欄が増えるたびに確認のコードと説明の文書を両方直す必要がある。Zod なら、型・確認・説明を 1 か所に書ける
- JSON Schema を書き出せば、Node.js 以外（エディタ、エージェント、Python など別の言語のツール）にも同じ定義を配れる。Zod 4 は `z.toJSONSchema()` で書き出せる
- TypeScript の型も Zod の定義から作れるので、将来 Viewer を作り直すときにそのまま使える

## 影響

### メリット

- 欄の追加や変更が、スキーマ定義の 1 か所の修正で済む
- 項目を書く人が、エディタで欄の名前や書き方の誤りにその場で気づける
- `schema_version` ごとの差分を、スキーマ定義の差分として PR でレビューできる

### 懸念点

- YAML の落とし穴（勝手な型の変換、字下げの誤り）は残る
  - 緩和策: 今と同じく `CORE_SCHEMA` で読み込み、日付などを勝手に変換させない。誤りは Zod の確認で止める
- Zod の誤りの文は英語で、項目を書く人に分かりにくい
  - 緩和策: 欄ごとに日本語の誤りの文を付け、今の `export.js` と同じく「どのファイルの何が違うか」を表示する
- `guide/` に TypeScript の実行環境が必要になる
  - 緩和策: Node.js の型を取り除く機能（Node.js 22.18 以降は既定で有効）を使い、ビルドの手順を増やさない

## 代替案

- **YAML と手書きの確認のまま**: 今は動いている。欄が増えるほど確認と文書の修正が増え、ほかのツールとも定義を共有できない
- **JSON Schema を手で書き、それを正とする**: 言語に依存しない。一方で書きにくく、ファイルをまたぐ確認は書けない
- **項目を TypeScript のファイルで書く**: 型がもっとも強く効く。一方でエンジニアでない人が直しにくく、コメントや差分も読みにくくなる。入りやすさを失うので採らない

## 今後の方向性

- [ADR 0001](0001-implementation-language.md) で Python にそろえることになった場合は、Zod を Pydantic に置き換えてこの ADR を直す（YAML で書き、JSON Schema を書き出す方針は変えない）
- スキーマ v2 の定義を Zod で書くところから始め、`export.js` の確認を置き換える
- `project.yml`（利用者側のファイル）のスキーマも、同じ形で定義して配る
- スキーマ定義の変更が多くなったら、`schema_version` を上げるときの移行スクリプトを用意する

## 参考

- [ADR 0001: 実装の言語](0001-implementation-language.md)
- [Zod: JSON Schema](https://zod.dev/json-schema)
- [YAML Language Server の schema の指定](https://github.com/redhat-developer/yaml-language-server)
- [ADR 0005: スキーマ v2 と、利用者側に残すファイル](0005-schema-v2-and-project-state.md)
