# weekly-security-checker

アカウントや organization のリポジトリを毎週まとめて調べ、セキュリティの指摘を、非公開のリポジトリの Issue にまとめる GitHub Action です。

> [!NOTE]
> **試験運用中です。** 動かしてみた感想や、うまく動かなかったこと、足してほしい点検を [Issue](https://github.com/yokinist/weekly-security-checker/issues) で教えてください。

点検表のページ「[はじめてのセキュリティ点検](https://yokinist.github.io/first-security-checkup/)」のうち、自動で調べられる部分を見張り続けるためのものです。

## なぜ、まとめて調べるのか

危ないのは、いま触っているリポジトリより、動いたまま誰も見なくなったリポジトリです。古い依存パッケージや、消し忘れたキーが残っていても、気づく人がいません。1 つずつ設定する仕組みだと、そういうリポジトリほど漏れます。そこで、アカウントや organization のリポジトリを、まとめて毎週調べます。

## 調べるもの

| 種類 | 調べ方 | Issue のまとめ方 |
|---|---|---|
| 依存パッケージの脆弱性 | Dependabot alerts | リポジトリごとに 1 件。パッケージ別の表と、全件直るバージョン |
| 漏れたシークレット | Secret scanning alerts | アラートごとに 1 件 |
| コードの問題 | Code scanning alerts | ルールごとに 1 件 |
| 設定の抜け | GitHub の API と、clone したファイル | リポジトリごとに 1 件。直し方のコマンドや書き方つき |
| 履歴に残ったシークレット | [gitleaks](https://github.com/gitleaks/gitleaks) | リポジトリごとに 1 件。値は載せない |
| ワークフローの危ない書き方 | [zizmor](https://docs.zizmor.sh/)（深刻度 medium 以上） | リポジトリごとに 1 件 |

「設定の抜け」では、Dependabot・Secret scanning・CodeQL が無効になっていることを指摘します。非公開リポジトリでは push protection と CodeQL が有料なので、代わりに gitleaks の pre-commit フックと Semgrep が入っているかを調べ、無ければその書き方を示します。

対象は、最近 push された順に `max-repos` 件（既定は 8 件）です。fork・アーカイブ済み・空のリポジトリは除きます。

## 使い方

1. **Issue を集める非公開のリポジトリを作る**

   Issue に脆弱性の情報が載るので、必ず **private** にします。public だと、起票の前に中止します。

2. **読み取り専用のトークンを作る**

   [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) を作ります。

   - Resource owner：調べたいアカウントか organization
   - Expiration：90 日など（期限が来たら作り直して登録し直す）
   - Repository access：All repositories
   - Repository permissions（すべて **Read-only**）：Contents、Dependabot alerts、Secret scanning alerts、Code scanning alerts（Metadata は自動で付く）

   Contents は、gitleaks と zizmor のために clone するのに使います。全リポジトリのコードを読める権限なので、期限は短めにしてください。

3. **トークンを登録する**

   1 で作ったリポジトリの Settings → Secrets and variables → Actions に、`SCAN_TOKEN` として登録します。

   ```bash
   gh secret set SCAN_TOKEN -R <owner>/<1 で作ったリポジトリ>
   ```

4. **ワークフローを置く**

   1 で作ったリポジトリに `.github/workflows/weekly-security-check.yml` を置きます。

   ```yaml
   name: weekly security check

   on:
     schedule:
       - cron: "0 0 * * 1" # 毎週月曜 9:00 JST
     workflow_dispatch:

   permissions:
     contents: read
     issues: write

   jobs:
     check:
       runs-on: ubuntu-latest
       timeout-minutes: 15
       steps:
         - uses: yokinist/weekly-security-checker@v0.1.1
           with:
             scan-token: ${{ secrets.SCAN_TOKEN }}
   ```

   タグは後から付け替えられるので、実際に使うときはコミットの SHA に固定するのがおすすめです（[pinact](https://github.com/suzuki-shunsuke/pinact) の `pinact run` で置き換えられます）。

5. **試しに動かす**

   Actions タブから Run workflow を押します。最初は `dry-run: true` を渡すと、起票せずに計画だけを確かめられます。

### 入力

| 名前 | 既定 | 説明 |
|---|---|---|
| `scan-token` | （必須） | 2 で作った読み取り専用のトークン |
| `target` | ワークフローを置いたリポジトリの持ち主 | 調べる `owner`（アカウントか organization）、または 1 つだけ調べるときの `owner/repo` |
| `max-repos` | `8` | 調べるリポジトリの上限。最近 push された順に選ぶ |
| `dry-run` | `false` | `true` なら起票せず、計画と本文だけを出す |
| `github-token` | `github.token` | 起票に使うトークン（`issues: write` があればよい） |

## Issue の扱い

- タイトルは `[リポジトリ名] …`、ラベルは `repo:<リポジトリ名>` `severity:<深刻度>` `kind:<種類>` です
- 同じ指摘は二重に起票しません。内容が変わると本文を更新し、直ると自動で閉じ、再発すると開き直します
- 対応しないと決めた Issue は **Close as not planned** で閉じます。再発しても開き直しません
- 履歴のシークレットの誤検知は、Issue に載っている fingerprint を対象リポジトリの `.gitleaksignore` に書いて外します
- ツールが動かなかった・clone できなかったなど、調べられなかった種類の Issue は閉じません

## 安全のための作り

- 読み取りは `scan-token`（読み取り専用）、起票はワークフローの `GITHUB_TOKEN` と、トークンを分けています
- 対象のリポジトリは一時ディレクトリに clone して読むだけで、ビルドやインストールなどコードの実行はしません（Git LFS の実体も取りません）
- gitleaks と zizmor は版を固定し、ハッシュを確かめてから入れます。PATH は調べるステップの中だけで通します
- シークレットの値は Issue に書きません
- 一時的な API のエラー（502・503・504）は読み取りだけやり直します。書き込みは二重に作らないようやり直しません

## 手元で試す

`gh` でログインしていれば、手元でも動きます。gitleaks と zizmor が PATH にあればそれらも実行し、無ければその 2 つは「未実行」になります（関係する Issue は閉じません）。

```bash
DEST_REPO=<owner>/<Issue を集めるリポジトリ> python3 scan.py <owner> --max 8 --dry-run
```

```bash
python3 test_scan.py
```

## ライセンス

[MIT](LICENSE)
