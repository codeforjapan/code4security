# はじめてのセキュリティ点検

個人開発やシビックテックなど、専任のセキュリティ担当がいないプロジェクト向けのセキュリティ点検。プロジェクトで使っているもの（conditions）を選ぶと、関係する点検項目（items）が決まる。各項目は、対策が済んだ状態を表す一文と、放っておいたときのリスク、対策が必要な理由、使えるツールやコマンドを持つ。

> よくある穴を減らすための目安で、すべての項目を満たしても安全を保証するものではない。個人情報を多く扱うときや、自治体などと契約して運用するときは、専門家による診断も検討する。

## 使い方

1. 対象のプロジェクトに当てはまる conditions の id をすべて選ぶ。当てはまるか分からないものは利用者に確かめ、確かめられなければ選んでおく
2. items のうち、when が空のもの、または when に手順 1 で選んだ id を 1 つでも含むものが、そのプロジェクトの点検項目になる
3. 点検項目を level の小さい順（1 まずやる → 2 次にやる → 3 余裕ができたら）に確かめる。title の状態になっていれば済み、なっていなければ how の手順で対策する
4. 非公開リポジトリで有料の機能を使う項目は、how_for_private_repos の代わりの手段を使う

## 優先度

- **まずやる**: 被害が大きく、手間の少ないもの
- **次にやる**: 続けて運用していくなら
- **余裕ができたら**: 利用者や関わる人が増えてきたら

## 条件

- `org`: GitHub の organization（org）で運営している（GitHub とチーム）
- `team`: 複数人で開発している（GitHub とチーム）
- `public`: 公開リポジトリがある（GitHub とチーム）
- `private`: 非公開リポジトリがある（GitHub とチーム）
- `actions`: GitHub Actions を使っている（GitHub とチーム）
- `frontend`: ブラウザで動く画面（Next.js・Vite など）（作っているもの）
- `auth`: ログイン機能（作っているもの）
- `form`: 入力フォーム（問い合わせ・申込など）（作っているもの）
- `ugc`: 利用者の投稿をほかの人にも見せる機能（作っているもの）
- `upload`: ファイルのアップロード（作っているもの）
- `ai`: 生成 AI を使った機能（作っているもの）
- `deps`: npm や pip などの外部パッケージ（使っているもの）
- `db`: データベース（使っているもの）
- `firebase`: Firebase（使っているもの）
- `supabase`: Supabase（使っているもの）
- `paidapi`: 従量課金の API（地図・生成 AI・メール送信など）（使っているもの）
- `deploy`: Vercel・Netlify・クラウドなどのホスティング（使っているもの）
- `server`: 自前のサーバー（VPS など）（使っているもの）
- `domain`: 独自ドメイン（使っているもの）
- `pii`: 氏名や連絡先などの個人情報（扱うデータ）
- `sensitive`: 健康・福祉・子どもなど、特に配慮が必要な情報（扱うデータ）
- `share`: スプレッドシートやクラウドストレージで共有しているデータ（扱うデータ）

## 点検項目

### 棚卸し

#### [まずやる] 使っていないリポジトリをアーカイブした

- 関係するプロジェクト: すべて
- リスク: 使っていないリポジトリにも古い依存パッケージが残り、脆弱性の通知が出続けます。誰も見ていないので直されず、通知が増えるほど本当に危ないものが埋もれます。
- なぜ必要か: アーカイブすると読み取り専用になり、手を入れなくてよいものとして区別できます。ただし公開リポジトリに残ったキーはアーカイブしても見えるので、先に失効させます。チームなら、残すリポジトリごとに担当者を決めておくと、指摘を確実に誰かへ渡せます。
- 使えるもの:
  - 最後に更新した日が古い順に並べて、使っていないものを探します。

  ```
  gh repo list <owner> --limit 1000 --no-archived \
    --json name,pushedAt \
    --jq 'sort_by(.pushedAt) | .[] | "\(.pushedAt[:10]) \(.name)"'
  ```

  ```
  gh repo archive <owner>/<repo>
  ```

- 関連資料: [GitHub Docs「リポジトリのアーカイブ」](https://docs.github.com/ja/repositories/archiving-a-github-repository/archiving-repositories)

#### [次にやる] デプロイ先（Vercel・Netlify・Firebase・Supabase など）と、そのアカウントの持ち主が一覧になっている

- 関係するプロジェクト: Vercel・Netlify・クラウドなどのホスティング のどれか
- リスク: 抜けたメンバーの個人アカウントで本番が動き続けていると、その人と連絡が取れなくなったとき、誰もサービスを止めることも直すこともできません。そのアカウントが乗っ取られても気づけません。
- なぜ必要か: どこで何が動いていて、誰が管理できるかがわかれば、問題が起きたときにすぐ止められます。
- 使えるもの:
  - 共有のスプレッドシート 1 枚で足ります。チーム用のアカウントに移すか、少なくとも 2 人を管理者にしておきます。

#### [次にやる] 連携している GitHub Apps・OAuth Apps・デプロイキーを見直した

- 関係するプロジェクト: すべて
- リスク: 試しに入れたアプリが全リポジトリへの書き込み権限を持ったまま残っていたり、古いデプロイキーに書き込み権限が付いたままだったりします。その提供元が侵害されると、自分たちのリポジトリまで書き換えられます。
- なぜ必要か: 使っていない連携を外せば、よそで起きた事故に巻き込まれる経路が減ります。
- 使えるもの:
  - [連携している GitHub Apps](https://github.com/settings/installations)
  - [許可した OAuth Apps](https://github.com/settings/applications)

  ```
  gh api repos/<owner>/<repo>/keys
  ```

- 関連資料: [GitHub Docs「インストールされている GitHub App の確認と変更」](https://docs.github.com/ja/apps/using-github-apps/reviewing-and-modifying-installed-github-apps)、[GitHub Docs「デプロイキーの管理」](https://docs.github.com/ja/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

### アカウントと権限

#### [まずやる] 自分を含め、関わる全員が 2 要素認証（2FA）を使っている（organization なら必須にしている）

- 関係するプロジェクト: すべて
- リスク: パスワードだけのアカウントは、使い回しやフィッシングで簡単に乗っ取られます。乗っ取られると、コードの書き換えもシークレットの持ち出しもできてしまいます。
- なぜ必要か: 2FA があれば、パスワードが漏れただけではログインされません。パスキーやセキュリティキーなら、フィッシングにも強くなります。
- 使えるもの:
  - 自分のアカウントは Settings → Password and authentication で 2FA を有効にします。ホスティングやデータベースなど、ほかのサービスのアカウントも同じです。
  - [自分の 2FA の設定](https://github.com/settings/security)
  - organization なら Settings → Authentication security → Require two-factor authentication で全員に必須にします。必須にすると、2FA を設定していない外部コラボレーターは外され、メンバーは設定するまで organization のリソースを使えなくなるので、先に全員に設定してもらいます。
- 関連資料: [GitHub Docs「2 要素認証を設定する」](https://docs.github.com/ja/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication)、[GitHub Docs「Organization で 2 要素認証を必須にする」](https://docs.github.com/ja/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization)、[OWASP Cheat Sheet「Multifactor Authentication」](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)、[OpenSSF「Concise Guide for Developing More Secure Software」](https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software)

#### [まずやる] 抜けた人の権限と、不要な外部コラボレーターを外した

- 関係するプロジェクト: 複数人で開発している、GitHub の organization（org）で運営している のどれか
- リスク: 抜けた人のアカウントに権限が残っていると、そのアカウントが乗っ取られたとき、今も使っているリポジトリまで書き換えられます。本人に悪意がなくても起こります。
- なぜ必要か: 抜けるときに権限を外す手順を決めておけば、使われていない権限が溜まりません。
- 使えるもの:
  - organization なら、外部コラボレーターの一覧を出します。

  ```
  gh api --paginate orgs/<org>/outside_collaborators --jq '.[].login'
  ```

  - 個人アカウントのリポジトリなら、リポジトリごとのコラボレーターを確かめます。

  ```
  gh api --paginate repos/<owner>/<repo>/collaborators --jq '.[].login'
  ```

- 関連資料: [GitHub Docs「Organization のリポジトリから外部コラボレーターを削除する」](https://docs.github.com/ja/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/removing-an-outside-collaborator-from-an-organization-repository)、[GitHub Docs「Organization でのデータ漏えいを防ぐためのベストプラクティス」](https://docs.github.com/ja/code-security/getting-started/best-practices-for-preventing-data-leaks-in-your-organization)

#### [次にやる] organization の基本権限を Read 以下にし、Owner を必要な人だけにした

- 関係するプロジェクト: GitHub の organization（org）で運営している のどれか
- リスク: Owner は organization の削除や設定の変更、シークレットの差し替えまでできます。Owner が多いほど、そのうち誰かが乗っ取られる可能性が上がります。
- なぜ必要か: 普段の作業は書き込み権限で足ります。Owner を絞れば、1 人が乗っ取られたときの被害を小さくできます。
- 使えるもの:

  ```
  gh api --paginate 'orgs/<org>/members?role=admin' --jq '.[].login'
  ```

- 関連資料: [GitHub Docs「Organization でのデータ漏えいを防ぐためのベストプラクティス」](https://docs.github.com/ja/code-security/getting-started/best-practices-for-preventing-data-leaks-in-your-organization)

#### [次にやる] 期限のない personal access token を使っていない

- 関係するプロジェクト: すべて
- リスク: 期限のないトークンは、どこかに置き忘れたり漏れたりすると、気づくまでずっと使われ続けます。classic のトークンは、全リポジトリへの広い権限を持ちがちです。
- なぜ必要か: 期限と権限を絞っておけば、漏れても被害の範囲と期間が限られます。
- 使えるもの:
  - [fine-grained のトークン一覧](https://github.com/settings/personal-access-tokens)
  - [classic のトークン一覧](https://github.com/settings/tokens)
- 関連資料: [GitHub Docs「個人用アクセストークンを管理する」](https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

### シークレットと API キー

#### [まずやる] キーを含むコミットを、push の前に止める仕組みがある

- 関係するプロジェクト: 公開リポジトリがある、非公開リポジトリがある のどれか
- リスク: API キーやパスワードをうっかりコミットして公開すると、数分で自動収集されて悪用されることがあります。クラウドの高額請求やデータの持ち出しにつながります。
- なぜ必要か: push protection は、キーを含む push をその場で止めます。secret scanning は、すでに入ってしまったキーを見つけます。
- 使えるもの:

  ```
  gh api -X PATCH repos/<owner>/<repo> \
    -f 'security_and_analysis[secret_scanning][status]=enabled' \
    -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
  ```

- 非公開リポジトリなら: 非公開リポジトリでは push protection が有料です（GitHub Secret Protection）。代わりに、gitleaks をコミットの前に動かして止めます。pre-commit を入れて（pip install pre-commit など）、リポジトリの直下に .pre-commit-config.yaml を置き、各自の手元で pre-commit install を一度実行します。

  ```
  repos:
    - repo: https://github.com/gitleaks/gitleaks
      rev: v8.30.1
      hooks:
        - id: gitleaks
  ```

- 関連資料: [GitHub Docs「シークレットスキャンについて」](https://docs.github.com/ja/code-security/secret-scanning/introduction/about-secret-scanning)、[GitHub Docs「プッシュ保護について」](https://docs.github.com/ja/code-security/secret-scanning/introduction/about-push-protection)、[GitHub Changelog「Introducing GitHub Secret Protection and GitHub Code Security」（2025-03-04）](https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/)、[gitleaks](https://github.com/gitleaks/gitleaks)

#### [次にやる] 非公開リポジトリも、過去のコミット履歴までキーが残っていないか調べた

- 関係するプロジェクト: すべて
- リスク: ファイルから消したキーも、コミット履歴には残っています。非公開リポジトリを公開に切り替えたときや、メンバーの PC から漏れたときに、まとめて他人の目に触れます。
- なぜ必要か: 非公開リポジトリでは GitHub の secret scanning が有料なので、無料のツールで履歴まで調べます。
- 使えるもの:

  ```
  gitleaks git -v --redact .
  ```

  - [gitleaks](https://github.com/gitleaks/gitleaks)
- 関連資料: [GitHub Changelog「Introducing GitHub Secret Protection and GitHub Code Security」（2025-03-04）](https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/)

#### [次にやる] ブラウザに届く環境変数に、秘密の値を入れていない

- 関係するプロジェクト: ブラウザで動く画面（Next.js・Vite など） のどれか
- リスク: NEXT_PUBLIC_ や VITE_ で始まる環境変数は、ビルドのときにページの JavaScript へ埋め込まれます。秘密のキーを入れると、ページを開いた誰でも読めます。
- なぜ必要か: ブラウザに渡してよい値と、サーバーだけで使う値を分けておけば、知らないうちに公開してしまうことを防げます。
- 使えるもの:

  ```
  grep -rnE '(NEXT_PUBLIC|VITE|EXPO_PUBLIC)_[A-Z0-9_]*(SECRET|TOKEN|PRIVATE|KEY|PASSWORD|SERVICE_ROLE)' \
    --exclude-dir={node_modules,.next,dist,build} .
  ```

  - Firebase の apiKey や Supabase の anon（publishable）キーのように、ブラウザに出してよいキーも見つかります。見つかったものが本当に秘密の値かを確かめます。
- 関連資料: [Next.js Docs「How to use environment variables in Next.js」](https://nextjs.org/docs/app/guides/environment-variables)、[Vite「環境変数とモード」](https://vite.dev/guide/env-and-mode)

#### [まずやる] 従量課金の API キーに、使える場所の制限と利用上限を付けた

- 関係するプロジェクト: 従量課金の API（地図・生成 AI・メール送信など）、生成 AI を使った機能 のどれか
- リスク: 地図や生成 AI、メール送信などの API キーが漏れたり、ブラウザから抜き取られたりすると、他人に使われて高額な請求が届きます。ブラウザで使うキーは、ページを開いた誰でも見られます。
- なぜ必要か: キーに使えるドメインや IP アドレスの制限を付け、利用上限や予算アラートを設定しておけば、漏れても被害を小さく抑えられ、早く気づけます。
- 使えるもの:
  - Google Cloud なら、API キーの制限と、API ごとの割り当て（quota）の上限を設定します。予算アラートは通知だけで、使用は止まりません。生成 AI の API なら、各サービスの管理画面で利用上限を設定します。
- 関連資料: [Google Cloud「API キーの管理に関するベストプラクティス」](https://cloud.google.com/docs/authentication/api-keys-best-practices)、[Google Cloud「予算と予算アラートの作成、編集、削除」](https://cloud.google.com/billing/docs/how-to/budgets)、[OWASP API Security Top 10「API4:2023 Unrestricted Resource Consumption」](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)

#### [まずやる] キーが漏れたら「まず失効させる」と決めてある

- 関係するプロジェクト: すべて
- リスク: 漏れたキーを履歴から消すだけで済ませると、すでにコピーした人はそのまま使い続けられます。値を Issue やチャットに貼ると、そこからまた漏れます。
- なぜ必要か: 失効させれば、漏れたキーは使えなくなります。手順を先に決めておけば、慌てずに済みます。
- 使えるもの:
  - 使っているキーごとに、発行した場所（管理画面）、失効と再発行の手順、差し替える場所（環境変数やデプロイ先の Secrets）を一覧にしておきます。一覧ができていれば完了です。
- 関連資料: [OWASP Cheat Sheet「Secrets Management」](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### 依存パッケージ

#### [まずやる] Dependabot alerts を有効にした

- 関係するプロジェクト: npm や pip などの外部パッケージ のどれか
- リスク: 使っているパッケージに既知の脆弱性があっても、有効にしていなければ誰にも知らされません。攻撃する側は、公開された脆弱性の情報をもとに古いままのサイトを狙います。
- なぜ必要か: 有効にすると、該当するパッケージと直し方が届きます。非公開リポジトリでも無料です。
- 使えるもの:

  ```
  gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts
  ```

- 関連資料: [GitHub Docs「Dependabot アラート」](https://docs.github.com/ja/code-security/dependabot/dependabot-alerts/about-dependabot-alerts)

#### [次にやる] Dependabot security updates で、修正 PR が自動で届くようにした

- 関係するプロジェクト: npm や pip などの外部パッケージ のどれか
- リスク: 通知が届いても、手で直す手間がかかると後回しになり、その間ずっと穴が開いたままになります。
- なぜ必要か: 修正 PR が自動で届けば、確認してマージするだけで済みます。
- 使えるもの:

  ```
  gh api -X PUT repos/<owner>/<repo>/automated-security-fixes
  ```

- 関連資料: [GitHub Docs「Dependabot セキュリティアップデート」](https://docs.github.com/ja/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates)

#### [次にやる] lockfile をコミットしている

- 関係するプロジェクト: npm や pip などの外部パッケージ のどれか
- リスク: lockfile がないと、インストールのたびに違うバージョンが入ることがあります。本番でどのバージョンが動いているかわからず、脆弱性の影響を受けるかどうかも判断できません。
- なぜ必要か: 入るバージョンが固定され、脆弱性の通知とも正しく照らし合わせられます。
- 使えるもの:
  - package-lock.json、pnpm-lock.yaml、uv.lock など

#### [余裕ができたら] 公開されたばかりの版は、数日待ってから入れるようにした

- 関係するプロジェクト: npm や pip などの外部パッケージ のどれか
- リスク: 人気のパッケージが乗っ取られ、悪意あるコードを含む版が公開される事件が続いています。公開直後の版を入れると、インストールしただけでキーなどを盗まれることがあります。
- なぜ必要か: 悪意ある版の多くは、数時間から数日で見つかって取り下げられます。数日待つだけで、ほとんどを避けられます。
- 使えるもの:
  - npm の min-release-age、pnpm の minimumReleaseAge、Renovate の minimumReleaseAge、Dependabot の cooldown で、待つ日数を設定できます。
- 関連資料: [CISA「Widespread Supply Chain Compromise Impacting npm Ecosystem」（2025-09-23）](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem)、[pnpm「minimumReleaseAge」](https://pnpm.io/settings#minimumreleaseage)、[Renovate Docs「minimumReleaseAge」](https://docs.renovatebot.com/configuration-options/#minimumreleaseage)

#### [余裕ができたら] 手元や CI で、依存パッケージの脆弱性を調べられるようにした

- 関係するプロジェクト: npm や pip などの外部パッケージ のどれか
- リスク: Dependabot が見ていない場所（GitHub 以外のリポジトリや、手元での作業中）では、脆弱性のあるパッケージを入れても気づけません。
- なぜ必要か: GitHub の脆弱性情報も取り込んだ OSV のデータベースを使って、Dependabot を使えない場所でも確かめられます。
- 使えるもの:

  ```
  osv-scanner scan source -r .
  ```

  - [OSV-Scanner](https://google.github.io/osv-scanner/)

### コード

#### [次にやる] コードの静的解析を、push のたびに自動で動かしている

- 関係するプロジェクト: 公開リポジトリがある、非公開リポジトリがある のどれか
- リスク: SQL インジェクションやクロスサイトスクリプティングのような典型的な穴は、書いた本人もレビューした人も見落としがちです。
- なぜ必要か: push のたびに自動で調べ、よくある穴を指摘してくれます。
- 使えるもの:

  ```
  gh api -X PATCH repos/<owner>/<repo>/code-scanning/default-setup \
    -f state=configured
  ```

- 非公開リポジトリなら: 非公開リポジトリでは CodeQL が有料です（GitHub Code Security）。代わりに、Semgrep の無料版を手元や CI で動かします。

  ```
  semgrep scan --config auto
  ```

- 関連資料: [GitHub Docs「コードスキャンの既定のセットアップの構成」](https://docs.github.com/ja/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning)、[GitHub Changelog「Introducing GitHub Secret Protection and GitHub Code Security」（2025-03-04）](https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/)、[Semgrep Docs「Quickstart」](https://semgrep.dev/docs/getting-started/quickstart)、[IPA「安全なウェブサイトの作り方」](https://www.ipa.go.jp/security/vuln/websecurity/about.html)

#### [余裕ができたら] PR ごとに AI のセキュリティレビューを通している

- 関係するプロジェクト: すべて
- リスク: 「ログインしていれば他人のデータも見られる」といった認可の漏れは、決まったルールで調べるツールではなかなか見つかりません。
- なぜ必要か: AI はコードの意図を読んで、こうした穴も指摘できることがあります。見落としや誤りもあるので、人のレビューの代わりにはなりません。新しく入る穴を止める役なので、今ある穴は別に調べます。
- 使えるもの:
  - [claude-code-security-review](https://github.com/anthropics/claude-code-security-review)
  - 手元なら Claude Code の /security-review
  - 公開リポジトリでは、外部からの PR を AI に読ませると操られるおそれがあります。Settings → Actions → General で、外部のコントリビューターからの実行に承認を必須にします。

### ログイン機能

#### [まずやる] ログインした人が、他人のデータを見たり変えたりできないことを確かめた

- 関係するプロジェクト: ログイン機能 のどれか
- リスク: URL や API の ID を書き換えるだけで他人の登録情報が見えてしまう穴は、Web アプリでいちばん多い脆弱性の一つです。ログイン画面があっても、データごとに「誰のものか」を確かめていなければ防げません。
- なぜ必要か: データを返すときと書き換えるときに、毎回サーバー側で持ち主を確かめれば、ID を推測されても他人のデータには届きません。
- 使えるもの:
  - テスト用のアカウントを 2 つ作り、片方でログインしたまま、もう片方のデータの URL や ID を直接開いて、見えないことを確かめます。
  - Claude Code の /security-review でも、こうした認可の漏れを探せます。
- 関連資料: [OWASP Top 10:2025「A01 Broken Access Control」](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)、[OWASP Cheat Sheet「Authorization」](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

#### [次にやる] パスワードの保存やログインの仕組みを自前で作っていない

- 関係するプロジェクト: ログイン機能 のどれか
- リスク: パスワードをそのまま、または弱い方法で保存していると、データベースが漏れたときに全員のパスワードが読まれます。同じパスワードを使い回している人は、ほかのサービスまで危なくなります。
- なぜ必要か: 実績のある認証サービスやライブラリを使えば、パスワードの安全な保存、総当たりへの対策、2FA などをまとめて任せられます。
- 使えるもの:
  - Firebase Authentication、Supabase Auth、Auth.js、Clerk など。Auth.js なら、パスワードを自分で扱う Credentials ではなく、外部のアカウントでのログインを使います。
- 関連資料: [OWASP Cheat Sheet「Authentication」](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)、[OWASP Cheat Sheet「Password Storage」](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### 利用者からの入力

#### [次にやる] 入力フォームに、bot 対策と送信回数の制限を入れた

- 関係するプロジェクト: 入力フォーム（問い合わせ・申込など） のどれか
- リスク: 誰でも送れるフォームは bot に狙われ、大量のスパムが届いたり、通知メールの送信やデータベースの容量で費用が膨らんだりします。入力欄に攻撃用の文字列を送り込まれることもあります。
- なぜ必要か: bot 対策と、同じ送信元からの回数制限を入れれば、自動の大量送信を止められます。入力された値は、ブラウザ側だけでなくサーバー側でも必ず確かめます。
- 使えるもの:
  - Cloudflare Turnstile などの bot 対策と、ホスティングやフレームワークの回数制限（レート制限）の機能
- 関連資料: [Cloudflare Turnstile docs](https://developers.cloudflare.com/turnstile/)、[OWASP Cheat Sheet「Input Validation」](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### [次にやる] 利用者が書いた内容を、HTML として解釈させずに表示している

- 関係するプロジェクト: 利用者の投稿をほかの人にも見せる機能 のどれか
- リスク: 投稿にスクリプトを紛れ込ませられると、それを見たほかの利用者のブラウザで実行され、ログイン中のアカウントを乗っ取られたり、偽の画面を出されたりします（クロスサイトスクリプティング）。
- なぜ必要か: 表示するときに必ずエスケープすれば、投稿はただの文字として表示されます。React や Vue は標準でエスケープしますが、HTML をそのまま差し込む書き方をしている箇所は要注意です。
- 使えるもの:
  - HTML をそのまま差し込んでいる箇所を探します。

  ```
  grep -rnE 'dangerouslySetInnerHTML|v-html|innerHTML' \
    --exclude-dir=node_modules .
  ```

- 関連資料: [OWASP Cheat Sheet「Cross Site Scripting Prevention」](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)、[IPA「安全なウェブサイトの作り方」](https://www.ipa.go.jp/security/vuln/websecurity/about.html)

#### [次にやる] アップロードできるファイルの種類と大きさを制限し、保存先を非公開にした

- 関係するプロジェクト: ファイルのアップロード のどれか
- リスク: 何でもアップロードできると、不正なファイルを置かれて配布に使われたり、HTML や SVG に仕込んだスクリプトを実行されたりします。保存先が公開設定だと、ほかの人が上げた書類まで誰でも見られます。
- なぜ必要か: 受け付ける種類と大きさを決め、保存先を非公開にして、見る権限のある人にだけ期限付きの URL で渡せば、これらを防げます。
- 使えるもの:
  - Firebase Storage のセキュリティルール、Supabase Storage のポリシー、S3 や R2 の署名付き URL
- 関連資料: [OWASP Cheat Sheet「File Upload」](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

#### [次にやる] 生成 AI に渡すデータと権限を絞った

- 関係するプロジェクト: 生成 AI を使った機能 のどれか
- リスク: 利用者の入力や読み込ませた文書に「これまでの指示を無視して…」と書かれていると、AI が操られ、見せるべきでない情報を出したり、つないだ機能を勝手に使ったりします（プロンプトインジェクション）。入力した個人情報が外部の AI サービスに送られることも見落とされがちです。
- なぜ必要か: AI に渡すのは必要なデータだけにし、AI の出力でデータの書き換えやメール送信などを直接行わないようにすれば、操られても被害が広がりにくくなります。
- 使えるもの:
  - 使っている AI サービスで、送ったデータが学習に使われるかを確かめ、送る前に個人情報を取り除きます。
- 関連資料: [OWASP Gen AI Security Project「LLM01:2025 Prompt Injection」](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

### データベースとストレージ

#### [まずやる] データベースにインターネットから直接つながらないようにした

- 関係するプロジェクト: データベース、Supabase のどれか
- リスク: データベースがインターネットに公開されていると、弱いパスワードや既知の脆弱性を狙った自動の攻撃を受け続けます。見つかると、中身を丸ごと持ち出されたり、消されたりします。
- なぜ必要か: アプリのサーバーなど、必要な接続元だけに絞れば、攻撃の入口そのものがなくなります。アプリが使うデータベースのユーザーも、必要な権限だけにしておきます。
- 使えるもの:
  - クラウドの管理画面で、データベースの公開設定と、接続を許可する IP アドレスを確かめます。自分の PC から次のコマンドを実行して、つながらないことも確かめます（5432 は PostgreSQL のポートです。MySQL なら 3306 にします）。

  ```
  nc -vz <データベースのホスト名> 5432
  ```

  - Supabase なら、ダッシュボードの Network Restrictions で、データベースに直接つなげる接続元を絞れます。ブラウザから使う API はこの対象外なので、そちらは RLS で守ります。
- 関連資料: [OWASP Cheat Sheet「Database Security」](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)、[Supabase Docs「Network Restrictions」](https://supabase.com/docs/guides/platform/network-restrictions)

#### [次にやる] データベースのバックアップを取り、そこから戻せることを試した

- 関係するプロジェクト: データベース、Firebase、Supabase のどれか
- リスク: 誤って消したり、乗っ取られて消されたり暗号化されたりしたとき、バックアップがなければ元に戻せません。取っていても戻し方を試していないと、いざというときに使えないことがあります。
- なぜ必要か: 定期的なバックアップと戻せることの確認があれば、最悪の場合でもデータを取り戻せます。バックアップは本番とは別の場所と権限で保管します。
- 使えるもの:
  - マネージドサービスなら、自動バックアップの設定を確かめます。無料プランでは自動バックアップがないことがあります（Supabase の無料プランにはなく、supabase db dump で自分で書き出すよう案内されています）。自前のデータベースなら pg_dump や mysqldump を定期的に実行し、ときどき別の環境に戻してみます。
- 関連資料: [OWASP Cheat Sheet「Database Security」](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)、[CISA「#StopRansomware Guide」](https://www.cisa.gov/stopransomware/ransomware-guide)

#### [まずやる] Firebase のセキュリティルールが、誰でも読み書きできる設定になっていない

- 関係するプロジェクト: Firebase のどれか
- リスク: 試作のときの allow read, write: if true; が本番に残っていると、プロジェクトの ID を知っている誰でも、登録された個人情報を全件読んだり書き換えたりできます。ID はページを開けば見えます。ログインしていれば誰でも許す if request.auth != null; も、アカウントを作れば誰でも全件を読めるので同じです。
- なぜ必要か: ルールで「本人のデータだけ」に絞れば、アプリを通さない直接のアクセスも防げます。
- 使えるもの:
  - Firebase コンソールのルール画面と、エミュレータでのルールのテスト
- 関連資料: [Firebase「Firebase security checklist」](https://firebase.google.com/support/guides/security-checklist)、[Firebase「安全でないルールの回避」](https://firebase.google.com/docs/rules/insecure-rules)、[Firebase「Security Rules の単体テスト」](https://firebase.google.com/docs/rules/unit-tests)

#### [まずやる] Supabase の公開しているスキーマ（public など）の全テーブルで、RLS（行ごとのアクセス制御）を有効にした

- 関係するプロジェクト: Supabase のどれか
- リスク: RLS が無効なテーブルは、ブラウザに埋め込まれた anon キー（新しいプロジェクトでは publishable キー）を使えば、誰でも全件を読み書きできます。このキーはページを開けば見えます。
- なぜ必要か: RLS を有効にしてポリシーを書けば、キーが見えていても許可した行しか読めません。service_role キー（新しい secret キー）は RLS を無視するので、ブラウザのコードや NEXT_PUBLIC_ の変数には入れません。
- 使えるもの:
  - ダッシュボードの Security Advisor
- 関連資料: [Supabase Docs「Row Level Security」](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Supabase Docs「Advisors」](https://supabase.com/docs/guides/database/database-advisors)

#### [次にやる] スプレッドシートやストレージが「リンクを知っていれば誰でも見られる」になっていない

- 関係するプロジェクト: スプレッドシートやクラウドストレージで共有しているデータ のどれか
- リスク: 申込フォームの回答シートやアップロードされたファイルがこの設定のままだと、リンクが転送されたり検索に載ったりした時点で、個人情報が誰にでも見える状態になります。
- なぜ必要か: 共有範囲を関係者だけに絞れば、リンクが漏れても中身は見えません。
- 使えるもの:
  - Google ドライブの共有設定、S3・Cloud Storage・R2 のバケットの公開設定
- 関連資料: [Google ドライブ ヘルプ「Google ドライブのファイルを共有する」](https://support.google.com/drive/answer/2494822)

### 個人情報

#### [まずやる] 健康・福祉・子どもなどの情報は、本当に必要なときだけ集め、見られる人を絞っている

- 関係するプロジェクト: 健康・福祉・子どもなど、特に配慮が必要な情報 のどれか
- リスク: 病歴や障害、子どもの情報が漏れると、本人への影響が大きく取り返しがつきません。病歴や障害などの要配慮個人情報は、1 人分の漏えい（そのおそれを含む）でも、原則として個人情報保護委員会への報告と本人への通知が必要です。
- なぜ必要か: 集めなければ漏れません。集めるときは本人の同意を取り（要配慮個人情報では原則として必要です）、見られる人を最小限にし、保存期間を決めます。
- 使えるもの:
  - フォームの項目ごとに、本当に必要かを関係者と見直します。
- 関連資料: [個人情報保護委員会「個人情報の保護に関する法律についてのガイドライン（通則編）」](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/)、[個人情報保護委員会「漏えい等の対応とお役立ち資料」](https://www.ppc.go.jp/personalinfo/legal/leakAction/)

#### [余裕ができたら] 個人情報をログやエラー通知に出していない

- 関係するプロジェクト: 氏名や連絡先などの個人情報、健康・福祉・子どもなど、特に配慮が必要な情報 のどれか
- リスク: エラー通知やサーバーのログに氏名や住所が入ると、本来そのデータを見る権限のない人や外部サービスにも渡ります。
- なぜ必要か: ログに個人情報を出さなければ、漏れうる場所を本体のデータベースだけに絞れます。
- 使えるもの:
  - Sentry の Data Scrubbing、ログに出す値の見直し
- 関連資料: [OWASP Cheat Sheet「Logging」](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)、[Sentry Docs「Data Scrubbing」](https://docs.sentry.io/security-legal-pii/scrubbing/)

#### [次にやる] 集める個人情報を最小限にし、保存期間を決めた

- 関係するプロジェクト: 氏名や連絡先などの個人情報、健康・福祉・子どもなど、特に配慮が必要な情報、入力フォーム（問い合わせ・申込など） のどれか
- リスク: 使わない個人情報まで集めて期限なく持ち続けると、漏れたときの被害が大きくなり、説明やお詫びをする範囲も広がります。
- なぜ必要か: 持っていないデータは漏れません。集める項目と保存期間を決めるのが、いちばん手間のかからない対策です。
- 使えるもの:
  - フォームの項目ごとに「何に使うか」を書き出し、答えられない項目は消します。

### ドメインとサーバー

#### [次にやる] ドメインと DNS レコードの一覧があり、使っていないサブドメインのレコードを消した

- 関係するプロジェクト: 独自ドメイン のどれか
- リスク: 削除したサービスを指したままの DNS レコードがあると、第三者が同じ名前でサービスを作り、自分たちのドメインで偽のページを出せます（サブドメインの乗っ取り）。
- なぜ必要か: 使っていないレコードを消せば、乗っ取りの入口がなくなります。
- 使えるもの:
  - DNS の管理画面でレコードを書き出し、指している先がまだあるか確かめます。
- 関連資料: [OWASP WSTG「Test for Subdomain Takeover」](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/10-Test_for_Subdomain_Takeover)

#### [次にやる] 独自ドメインに SPF・DKIM・DMARC を設定した

- 関係するプロジェクト: 独自ドメイン のどれか
- リスク: 設定がないと、第三者がそのドメインを名乗ってメールを送れます。プロジェクトを名乗った偽の案内で、利用者がだまされます。
- なぜ必要か: SPF・DKIM を設定し、DMARC を p=quarantine か p=reject にすれば、受け取る側がなりすましを見分けて弾けます（p=none は報告だけです）。メールを送らないドメインなら、SPF に v=spf1 -all、DMARC に p=reject を設定します。
- 使えるもの:
  - SPF と DMARC の設定は、次のコマンドで確かめられます。

  ```
  dig +short TXT <ドメイン>
  dig +short TXT _dmarc.<ドメイン>
  ```

- 関連資料: [Gmail ヘルプ「メール送信者のガイドライン」](https://support.google.com/a/answer/81126)

#### [次にやる] サーバーの OS とソフトウェアを自動で更新し、SSH は鍵だけでログインできるようにした

- 関係するプロジェクト: 自前のサーバー（VPS など） のどれか
- リスク: インターネットに公開されたサーバーには、SSH へのパスワード総当たりや、既知の脆弱性を狙った攻撃が常に来ます。更新が止まったサーバーは乗っ取られ、ほかへの攻撃の踏み台に使われます。
- なぜ必要か: セキュリティ更新を自動で入れ、SSH のパスワードでのログインを止めて鍵だけにすれば、よくある攻撃の多くを防げます。使わないポートはファイアウォールで閉じます。
- 使えるもの:
  - Ubuntu なら、セキュリティ更新の自動適用（unattended-upgrades）は最初から入っていて有効です。入っていなければ次のコマンドで入れます。

  ```
  sudo apt install unattended-upgrades
  ```

  - SSH は、鍵でログインできることを確かめてから、/etc/ssh/sshd_config.d/00-no-password.conf に PasswordAuthentication no と書き、sudo systemctl restart ssh で反映します。次のコマンドで no と出れば完了です。

  ```
  sudo sshd -T | grep -i passwordauthentication
  ```

- 関連資料: [Ubuntu Server documentation「Automatic updates」](https://documentation.ubuntu.com/server/how-to/software/automatic-updates/)

### GitHub Actions とリポジトリの設定

#### [まずやる] ワークフローの GITHUB_TOKEN を読み取り専用にした

- 関係するプロジェクト: GitHub Actions を使っている のどれか
- リスク: GITHUB_TOKEN が書き込み可のままだと、ワークフローで使っている外部の action が乗っ取られたとき、その action からリポジトリに勝手に push されるおそれがあります。
- なぜ必要か: 読み取り専用にしておけば、乗っ取られた action にできることが限られます。書き込みが必要なジョブだけに許可を付けます。
- 使えるもの:
  - Settings → Actions → General → Workflow permissions を Read にします。各ワークフローの先頭にも permissions: contents: read を書きます。
- 関連資料: [GitHub Docs「自動トークン認証」（GITHUB_TOKEN）](https://docs.github.com/ja/actions/security-for-github-actions/security-guides/automatic-token-authentication)、[GitHub Docs「GitHub Actions のセキュリティ強化」](https://docs.github.com/ja/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

#### [次にやる] 外部の action をコミットの SHA で固定した

- 関係するプロジェクト: GitHub Actions を使っている のどれか
- リスク: action のタグ（v4 など）は、後から別のコードに付け替えられます。2025 年の tj-actions/changed-files の改ざんでは、タグで参照していた多くのリポジトリで、シークレットがログに流出しました。
- なぜ必要か: コミットの SHA は書き換えられないので、確認した版だけが動きます。
- 使えるもの:

  ```
  pinact run
  ```

  - [pinact](https://github.com/suzuki-shunsuke/pinact)
- 関連資料: [GitHub Advisory Database「tj-actions/changed-files」（CVE-2025-30066）](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)、[CISA「Supply Chain Compromise of Third-Party tj-actions/changed-files」（2025-03-18）](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)、[GitHub Docs「GitHub Actions のセキュリティ強化」](https://docs.github.com/ja/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

#### [余裕ができたら] ワークフローの危ない書き方を検査した

- 関係するプロジェクト: GitHub Actions を使っている のどれか
- リスク: Issue のタイトルや PR のブランチ名を run にそのまま埋め込むと、外部の人がその文字列でコマンドを実行できます。pull_request_target を誤って使うと、フォークからの PR にシークレットを渡してしまいます。
- なぜ必要か: zizmor はこうした危ない書き方を見つけ、直し方も示します。
- 使えるもの:

  ```
  uvx zizmor .
  ```

  - [zizmor](https://docs.zizmor.sh/)
- 関連資料: [GitHub Docs「GitHub Actions のセキュリティ強化」](https://docs.github.com/ja/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

#### [次にやる] main への直接の push と force push を禁止した

- 関係するプロジェクト: すべて
- リスク: 1 人のアカウントが乗っ取られただけで、レビューなしに本番のコードを書き換えられます。force push されると、元の履歴まで消されます。
- なぜ必要か: main への変更に PR と 1 人以上の承認を求めれば、1 人のアカウントが乗っ取られても、ほかの人の目を通さずには書き換えられません。1 人で開発しているなら、force push と削除の禁止だけでも設定します。
- 使えるもの:
  - Settings → Rules → Rulesets で設定します。非公開リポジトリでは、GitHub Free では使えません（Pro・Team 以上）。
- 関連資料: [GitHub Docs「ルールセットについて」](https://docs.github.com/ja/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

#### [余裕ができたら] OpenSSF Scorecard でリポジトリの設定をまとめて確かめた

- 関係するプロジェクト: すべて
- リスク: ブランチ保護やトークンの権限といったリポジトリの設定の穴は、1 つずつ画面を開かないと気づけません。
- なぜ必要か: Scorecard は設定をまとめて調べ、項目ごとの点数と直し方を示します。
- 使えるもの:

  ```
  GITHUB_AUTH_TOKEN=$(gh auth token) scorecard --repo=github.com/<owner>/<repo>
  ```

  - [OpenSSF Scorecard](https://github.com/ossf/scorecard)

### 報告の受け付けと対応

#### [まずやる] 脆弱性は非公開の場所で扱い、公開の Issue には書かないと決めてある

- 関係するプロジェクト: 公開リポジトリがある のどれか
- リスク: 公開リポジトリの Issue に脆弱性を書くと、直す前に攻撃の手順を誰にでも見える形で公開することになります。
- なぜ必要か: 非公開の場所で扱えば、直してから公表できます。
- 使えるもの:
  - GitHub の Security Advisory の下書き、または非公開のリポジトリ
- 関連資料: [OWASP Cheat Sheet「Vulnerability Disclosure」](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)、[GitHub Docs「リポジトリの非公開の脆弱性報告の構成」](https://docs.github.com/ja/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository)

#### [次にやる] SECURITY.md を置き、非公開の脆弱性報告（private vulnerability reporting）を有効にした

- 関係するプロジェクト: 公開リポジトリがある のどれか
- リスク: 穴を見つけた人に知らせる手段がないと、公開の Issue や SNS に書かれてしまうか、誰にも知らされないままになります。
- なぜ必要か: 非公開で報告できる窓口があれば、見つけてくれた人と安全にやり取りできます。
- 使えるもの:

  ```
  gh api -X PUT repos/<owner>/<repo>/private-vulnerability-reporting
  ```

- 関連資料: [GitHub Docs「リポジトリの非公開の脆弱性報告の構成」](https://docs.github.com/ja/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository)、[GitHub Docs「リポジトリへのセキュリティポリシーの追加」](https://docs.github.com/ja/code-security/getting-started/adding-a-security-policy-to-your-repository)

#### [次にやる] インシデントのとき、誰が判断して誰に連絡するかが決まっている

- 関係するプロジェクト: すべて
- リスク: 漏えいが起きてから「誰が止めるのか」「どこに連絡するのか」を決めていると、その間も被害が広がります。自治体などと組んでいる場合、報告の遅れはそのまま信頼の問題になります。
- なぜ必要か: 判断する人と連絡先を先に決めておけば、最初の 1 時間で動けます。個人情報が漏れた場合は、個人情報保護委員会への報告と本人への通知が必要になることがあります。
- 使えるもの:
  - 判断する人と連絡先を 1 枚にまとめ、README から辿れるようにします。
- 関連資料: [個人情報保護委員会「漏えい等の対応とお役立ち資料」](https://www.ppc.go.jp/personalinfo/legal/leakAction/)
