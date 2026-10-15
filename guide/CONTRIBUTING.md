# コントリビュートの手引き

「はじめてのセキュリティ点検」に協力してくださって、ありがとうございます。誤りの指摘、わかりにくい言い回しの改善、項目や資料の追加を歓迎します。

## はじめに

- 点検項目・条件・優先度・資料は、すべて [`data/`](data) の YAML にあります。**直すのはここだけ**です
- 項目は 1 項目 1 ファイルです（[`data/items/<カテゴリ>/<id>.yml`](data/items)）。ほかの人と同時に別の項目を直しても、ぶつかりません
- ページが読み込む `data.js` と、`checklist.json`・`checklist.md`・`llms.txt` は、main に入ったときに自動で作られます
- PR を送ると、`data/` の書き方が自動で確かめられます。誤りがあれば、どこが違うかが表示されます
- 直すべきか迷うときや、大きく変えたいときは、先に [Issue](https://github.com/yokinist/first-security-checkup/issues) で相談してください

## 何をどこで直すか

| やりたいこと | 直すファイル |
|---|---|
| 項目の文章を直す | `data/items/<カテゴリ>/<id>.yml` の `title`・`risk`・`why`・`how` |
| 項目を足す | 合うカテゴリのフォルダに `<id>.yml` を作り、同じフォルダの `_category.yml` の `items` に id を足す（並び順もここで決まる） |
| 優先度を変える | その項目の `level` |
| どんなプロジェクトに出すかを変える | その項目の `when` |
| 根拠を足す | その項目の `evidence` |
| 「当てはまるもの」の選択肢を足す | `data/conditions.yml` |
| 関連資料を足す | `data/sources.yml` に資料を足し、項目の `related` や `evidence` に key を書く |
| ページの最後の「おすすめの資料」を変える | `data/recommended.yml` |

ページの見た目や動き（`index.html`）を変えたいときは、先に Issue で相談してください。

## 項目の形

1 つの項目は、次の形です。「lockfile をコミットしている」（`data/items/deps/lockfile.yml`）をもとにした例です（`how` は、3 つの書き方を見せるために少し変えています）。

```yaml
id: lockfile          # 項目の識別子。ファイル名と同じにする。あとから変えない（変えると、チェックした状態が外れる）
level: 2              # 優先度。1 まずやる・2 次にやる・3 余裕ができたら
title: lockfile をコミットしている       # 対策が済んだ状態を、確かめられる一文で
when: [deps]          # この項目を出す条件（conditions.yml の id）。どれか 1 つに当てはまれば出る。[] なら、すべてのプロジェクトに出る
risk: lockfile がないと、…              # 放っておくと何が起きるか
why: 入るバージョンが固定され、…          # なぜその対策が必要か。何を防げるか
how:                  # 使えるもの。次の 3 つの形を、必要なだけ並べる
  - text: package-lock.json、pnpm-lock.yaml、uv.lock など
  - command: npm ci
  - title: npm Docs「npm ci」
    url: https://docs.npmjs.com/cli/v11/commands/npm-ci
related: [npmCi]      # 関連資料（sources.yml の key）。なければ []
evidence:             # 根拠（なくてもよい）。本文の事実を確かめた資料と日付
  - source: npmCi
    checked: '2026-10-15'
    note: npm ci は lockfile を書き換えない
mappings: []          # 対応する規格の番号（なくてもよい）。例: OpenSSF Baseline OSPS-AC-03.01
```

- `how` の `text` は説明、`command` はコピーして使うコマンド、`title` と `url` はリンクです
- 複数行のコマンドは `command: |-` のあとに、字下げして書きます
- コマンドの `<owner>`・`<repo>`・`<org>`・`<ドメイン>` などの `<…>` は、読む人が自分の値に置き換える部分です
- 非公開リポジトリでは GitHub の機能を使えない項目には、代わりの手段を `how_for_private_repos` の `text`（と `command`）に書きます
- `:` のあとに空白が続く文や、`#` を含む文は、`'…'` で囲みます。迷ったら囲んでおけば安全です

条件（`conditions.yml`）と資料（`sources.yml`）は、次の形です。

```yaml
# conditions.yml
- id: frontend
  group: 作っているもの
  label: ブラウザで動く画面（Next.js・Vite など）

# sources.yml
ghRulesets:
  title: GitHub Docs「ルールセットについて」
  url: https://docs.github.com/ja/…
```

## 項目を足す前に

項目は少ないほど、最後まで使ってもらえます。足す前に、次を確かめてください。

- 今ある項目に一文足せば済まないか
- 個人開発や小さなチームで、実際に起きている事故につながるものか
- 公式のドキュメントや公的機関の資料が、その対策を勧めているか

優先度は次の基準で決めます。

| level | 名前 | 基準 |
|---|---|---|
| 1 | まずやる | 被害が大きく、手間の少ないもの |
| 2 | 次にやる | 続けて運用していくなら |
| 3 | 余裕ができたら | 利用者や関わる人が増えてきたら |

## 文章の決まり

- 「放っておくと」（`risk`）と「なぜ必要か」（`why`）は分けて、具体的に書きます。1 文にまとめません
- `title` は「〜した」「〜している」の形にして、済んだかどうかを確かめられる一文にします
- 「ツール」「リポジトリ」と書きます。「道具」「リポ」とは書きません
- 専門用語は、初めて読む人にもわかるように言い換えるか、短い説明を添えます
- 怖がらせる書き方はしません。何が起きるかを、落ち着いて具体的に書きます

## 資料の決まり

- 本文に書く事実（設定の名前、料金やプラン、既定の値、日付など）は、資料を読んで確かめてから書きます。PR には、確かめた資料の URL を書いてください
- `related` に載せるのは、公式のドキュメントや公的機関の資料です。製品の宣伝や、出どころのわからない記事は載せません
- `related` は「より詳しく知るための資料」です。本文のすべてをその資料で確かめた、という意味ではありません
- 本文の事実を資料で確かめたときは、`evidence` に資料と確かめた日を書きます。いつの情報かがわかり、古くなったものを見つけやすくなります
- リンクは、開けることを確かめてから載せます。日本語版がある資料は、日本語版にします

## 送り方

### ブラウザだけで送る（手元に何も入れなくてよい）

1. 項目を直すなら、GitHub で [`data/items`](data/items) から項目のファイルを開き、鉛筆のボタン（Edit this file）を押します。項目を足すなら、カテゴリのフォルダで「Add file」→「Create new file」から `<id>.yml` を作り、同じフォルダの `_category.yml` にも id を足します
2. 直したら「Commit changes…」を押し、「Propose changes」で PR を作ります
3. PR の自動の確認（pages / build）が通れば準備完了です。通らなければ、表示された箇所を直します

### 手元で確かめてから送る

```sh
pnpm install
pnpm build
```

pnpm の版は `package.json` で決めています（corepack を使うと、その版が自動で使われます）。`pnpm build` は `data/` の書き方を確かめ、`data.js`・`checklist.json`・`checklist.md`・`llms.txt` を手元に作ります（これらはコミットしません）。`index.html` をブラウザで開けば、直したページを見られます。

コミットメッセージは `fix: 〜の説明を直す`、`feat: 〜の項目を足す` のような [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) の形で、日本語で書けます。

## ライセンス

送っていただいた変更は、文章とデータは [CC0 1.0](LICENSE-CONTENT.md)（パブリック・ドメイン）、コードは [MIT](LICENSE) で公開します。PR を送ることで、この条件で公開することに同意したものとします。

## 脆弱性の報告

このページ自体のセキュリティ上の問題は、Issue ではなく [SECURITY.md](SECURITY.md) の手順で、公開せずに知らせてください。
