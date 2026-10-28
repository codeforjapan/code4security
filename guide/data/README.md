# data

点検表の中身（項目・条件・優先度・資料）は、すべてこのフォルダの YAML にあります。直すのはここだけです。

ページが読み込む `data.js` と、`checklist.json`・`checklist.md`・`llms.txt` は、main に入ったときに、ここから自動で作られます。文章の書き方や資料の決まりは、[CONTRIBUTING.md の点検項目の入り口](../../CONTRIBUTING.md#点検項目の入り口guide) を見てください。

## ファイル

| ファイル | 中身 |
|---|---|
| `about.yml` | 点検表の名前・説明・注意書き |
| `levels.yml` | 優先度（まずやる・次にやる・余裕ができたら） |
| `conditions.yml` | 「当てはまるもの」の選択肢。項目の `when` から `id` で指す |
| `categories.yml` | カテゴリの並び順 |
| `items/<カテゴリ>/_category.yml` | カテゴリの名前・説明と、項目の並び順 |
| `items/<カテゴリ>/<id>.yml` | 項目。1 項目 1 ファイル |
| `sources.yml` | 資料。項目の `related`・`evidence` と、`recommended.yml` から key で指す |
| `recommended.yml` | ページの最後に載せる「おすすめの資料」 |

## 項目の欄

| 欄 | 必須 | 中身 |
|---|---|---|
| `id` | ○ | 項目の識別子。ファイル名と同じにする。あとから変えない（変えると、チェックした状態が外れる） |
| `level` | ○ | 優先度。1 まずやる・2 次にやる・3 余裕ができたら |
| `title` | ○ | 対策が済んだ状態を、確かめられる一文で |
| `when` | ○ | この項目を出す条件（`conditions.yml` の id）。どれか 1 つに当てはまれば出る。`[]` なら、すべてのプロジェクトに出る |
| `risk` | ○ | 放っておくと何が起きるか |
| `why` | ○ | なぜその対策が必要か、何を防げるか |
| `how` | ○ | 使えるもの。`text`（説明）、`command`（コマンド）、`title` と `url`（リンク）を並べる |
| `how_for_private_repos` |  | 非公開リポジトリで GitHub の機能を使えないときの、代わりの手段（`text` と `command`） |
| `related` | ○ | より詳しく知るための資料（`sources.yml` の key）。なければ `[]` |
| `evidence` |  | 本文の事実を確かめた資料（`source`）、確かめた日（`checked`）、確かめた内容（`note`） |
| `mappings` |  | 対応する規格の番号（OpenSSF Baseline、OWASP Top 10 など） |

書き方の例は [items/ci/ruleset.yml](items/ci/ruleset.yml) を見てください。

書くときの注意:

- 複数行のコマンドは、`command: |-` のあとの行に、字下げして書きます
- `: `（コロンと空白）や ` #` を含む文は、`'…'` で囲みます。迷ったら囲んでおけば安全です
- 確かめた日（`checked`）は `'2026-10-15'` のように囲みます
- コマンドの `<owner>`・`<repo>`・`<org>`・`<ドメイン>` などの `<…>` は、読む人が自分の値に置き換える部分です

## よくある作業

| やりたいこと | すること |
|---|---|
| 項目の文章を直す | `items/<カテゴリ>/<id>.yml` を直す |
| 項目を足す | 合うカテゴリのフォルダに `<id>.yml` を作り、同じフォルダの `_category.yml` の `items` に id を足す |
| カテゴリを足す | `items/<カテゴリ>/` と `_category.yml` を作り、`categories.yml` に足す |
| 資料を足す | `sources.yml` に key を足し、項目の `related` や `evidence` から指す |
| 「当てはまるもの」を足す | `conditions.yml` に足し、項目の `when` から指す |

## 確かめる

```sh
pnpm install
pnpm build
```

`pnpm build` は、書き出す前に次のことを確かめます。誤りがあれば、どのファイルの何が違うかを表示して止まります。PR を送ったときも、同じ確認が自動で動きます。

- ファイル名と `id` が同じか。`id` が重複していないか
- 項目のファイルが `_category.yml` に、カテゴリのフォルダが `categories.yml` に載っているか
- 書ける欄の名前だけを使っているか。必須の欄があるか
- `level` が `levels.yml` に、`when` が `conditions.yml` に、`related`・`evidence` が `sources.yml` にあるか
- `how` が `text`・`command`・`title` と `url` のどれかの形か
- `evidence` の `checked` が `2026-10-15` のような日付か
