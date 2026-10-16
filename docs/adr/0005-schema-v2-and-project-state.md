# ADR 0005: スキーマ v2 にエージェント向けの欄を足し、利用者側に残すファイルを決める

## ステータス

提案中

## 日付

2026-10-16

## コンテキスト

今の項目データ（`schema_version: 1`）は、人が読んで点検することを前提にしている。v1（[ADR 0003](0003-v1-scope.md)）では、エージェントが次のことをできる必要がある。

- 当てはまる条件を、リポジトリの中身から推測する
- 項目が済んでいるかを、自分で確かめる
- 項目を設定する（テンプレを置く、設定を変える）
- 項目を、ルーチンと脅威に結びつける

また、点検の結果をオーナーのリポジトリのどこに、どう残すかを決める必要がある。

## 決定

### 1. 既存の欄は残し、欄を足すだけにする（`schema_version: 2`）

項目の ID は変えない。どうしても変えるときは、古い ID を `deprecated_ids` に残す。

### 2. `conditions.yml` に `detect` と `ask` を足す

```yaml
- id: supabase
  group: 使っているもの
  label: Supabase
  detect:                     # エージェントが推測に使う手がかり。当たれば「当てはまりそう」と提案する
    files: [supabase/config.toml]
    deps: ["@supabase/supabase-js", supabase]
  ask: Supabase を使っていますか？   # detect で決められないときの聞き方
```

`pii`・`sensitive` のようにコードからは分からない条件は、`detect` を持たず、必ずオーナーに聞く。

### 3. 項目に `threats`・`routine`・`verify`・`setup` を足す

```yaml
id: gitleaks
# …既存の欄…
threats: [secret-leak]          # threats.yml の id。脅威モデルで使う
routine:                        # 回し続ける項目だけに付ける
  timing: pre-commit            # pre-commit | pr | weekly | monthly | release
  template: [lefthook-gitleaks] # plugin/templates/ のひな形 id
verify:                         # 済んだかの確かめ方
  - type: file                  # file | command | gh-api | ask
    path: lefthook.yml
    contains: gitleaks
  - type: command
    run: gitleaks git --redact --no-banner .
    expect: exit 0
setup:                          # エージェント向けの手順。人向けの how とは分ける
  - オーナーに、lefthook を入れてよいか（開発者全員の手元で動く）を確かめる
  - ひな形の lefthook-gitleaks をもとに lefthook.yml を書く
  - 過去の履歴を一度だけ調べ、見つかったキーは値を表示せずに場所だけ伝え、無効化を案内する
```

- `verify` は checker からも使う（どの場面で何を動かすかは [ADR 0007](0007-checker-entry-points.md)）
- `setup` に書くのは手順と注意点だけにし、ファイルの中身は plugin の設定のひな形（`plugin/templates/`）に置く

### 4. `guide/data/threats.yml` を新しく作る

```yaml
- id: secret-leak
  title: キーやトークンが漏れ、他人にサービスを使われる
  assets: [credentials]
- id: data-exposure
  title: データベースや共有ファイルから、個人情報がまとめて読まれる
  assets: [pii, sensitive]
```

脅威モデルは「条件 → 守るもの」「項目 → 防いでいる脅威」から組み立てる。v1 では STRIDE のような分類は使わず、平易な文で書く。`threat-model.md` の構造は、CyberRiskScape が書き出す `THREAT_MODEL.md` に合わせる（[ADR 0009](0009-cyberriskscape.md)）。

### 5. 利用者のリポジトリに残すファイル

```
.code4security/
  project.yml       # 使った checklist.json の版、条件と根拠、項目ごとの状態・理由・日付
  threat-model.md   # 脅威モデル
```

この 2 つは、まだ対策していない穴の一覧になる。そのため既定では `.gitignore` に入れる。チームで共有したいときは、非公開の場所（非公開リポジトリ、checker の Issue を集めるリポジトリなど）に置くよう案内する。

## 根拠

- 欄を足すだけなら、今の項目データと `checklist.json` を使っている側は壊れない
- `how`（人向け）と `setup`（エージェント向け）を分けると、人が読む文章を短いまま保てる。エージェントには確認の手順や注意点まで渡せる
- `verify` を決まった形にしておけば、済んだかの判断がエージェントによってぶれない。同じ定義を checker からも使える
- 弱点の一覧を公開リポジトリに置くと、攻撃する側に手がかりを渡してしまう。安全な側を既定にする

## 影響

### メリット

- 1 項目に `verify`・`setup` を足す作業が、小さな PR の単位になる（good first issue にしやすい）
- 脅威モデル・ルーチン・checker が、同じ項目 ID でつながる

### 懸念点

- 欄が増え、項目を書く人の負担が大きくなる
  - 緩和策: 新しい欄はすべて任意にし、level 1 の項目から順に埋める。欄の意味は [ADR 0006](0006-schema-definition.md) のスキーマ定義から、エディタで補完と説明が出るようにする
- `verify` の `command` が、利用者の環境で危険なコマンドを動かす
  - 緩和策: 読み取りだけのコマンドに限るとレビューの基準に書く。エージェントは動かす前にオーナーに見せる
- `.gitignore` に入れると、チームで点検の結果を共有しにくい
  - 緩和策: 非公開の置き場所の手順を、導入手順書に入れる

## 代替案

- **エージェント向けの情報を項目データに入れず、plugin の skill にまとめて書く**: 項目データは今のまま保てる。一方で、項目ごとの知識が 2 か所に分かれ、項目を足すたびに手順も直す必要がある
- **点検の結果を GitHub の Issue に残す**: 共有しやすいが、公開リポジトリでは弱点が公開される。エージェントが手元で読み書きしにくい

## 今後の方向性

- `project.yml` を checker の Issue 用リポジトリに集め、組織全体の状況を見られるようにするか検討する
- v1 のあとに、`project.yml` を読み込んで表示する Viewer を作る

## 参考

- [first-security-checkup の data/README.md](https://github.com/yokinist/first-security-checkup/blob/main/data/README.md)
- [ADR 0003: v1 の範囲](0003-v1-scope.md)
- [ADR 0006: スキーマ定義](0006-schema-definition.md)
- [ADR 0007: checker の起動ルート](0007-checker-entry-points.md)
- [ADR 0009: 脅威モデルと CyberRiskScape](0009-cyberriskscape.md)
