// はじめてのセキュリティ点検のデータ（https://yokinist.github.io/first-security-checkup/）。
// 文章とデータは CC BY 4.0、コードは MIT。
// 項目・条件・優先度・資料を直すときはこのファイルだけを触る。
// 直したら `node checklist/export-json.js` で checklist.json を作り直す。

// ---- 点検項目（カテゴリごと）。lv は優先度（1 まずやる・2 次にやる・3 余裕ができたら）、use は使えるもの、alt は非公開リポジトリでの代わりの手段 ----
const GROUPS = [
  {
    "id": "inventory",
    "title": "棚卸し",
    "items": [
      {
        "id": "archive",
        "t": "使っていないリポジトリをアーカイブした",
        "risk": "使っていないリポジトリにも古い依存パッケージが残り、脆弱性の通知が出続けます。誰も見ていないので直されず、通知が増えるほど本当に危ないものが埋もれます。",
        "why": "アーカイブすると読み取り専用になり、手を入れなくてよいものとして区別できます。ただし公開リポジトリに残ったキーはアーカイブしても見えるので、先に失効させます。チームなら、残すリポジトリごとに担当者を決めておくと、指摘を確実に誰かへ渡せます。",
        "use": [
          {
            "text": "最後に更新した日が古い順に並べて、使っていないものを探します。"
          },
          {
            "cmd": "gh repo list <owner> --limit 1000 --no-archived \\\n  --json name,pushedAt \\\n  --jq 'sort_by(.pushedAt) | .[] | \"\\(.pushedAt[:10]) \\(.name)\"'"
          },
          {
            "cmd": "gh repo archive <owner>/<repo>"
          }
        ],
        "lv": 1
      },
      {
        "id": "deploy",
        "t": "デプロイ先（Vercel・Netlify・Firebase・Supabase など）と、そのアカウントの持ち主が一覧になっている",
        "risk": "抜けたメンバーの個人アカウントで本番が動き続けていると、その人と連絡が取れなくなったとき、誰もサービスを止めることも直すこともできません。そのアカウントが乗っ取られても気づけません。",
        "why": "どこで何が動いていて、誰が管理できるかがわかれば、問題が起きたときにすぐ止められます。",
        "use": [
          {
            "text": "共有のスプレッドシート 1 枚で足ります。チーム用のアカウントに移すか、少なくとも 2 人を管理者にしておきます。"
          }
        ],
        "lv": 2
      },
      {
        "id": "apps",
        "t": "連携している GitHub Apps・OAuth Apps・デプロイキーを見直した",
        "risk": "試しに入れたアプリが全リポジトリへの書き込み権限を持ったまま残っていたり、古いデプロイキーに書き込み権限が付いたままだったりします。その提供元が侵害されると、自分たちのリポジトリまで書き換えられます。",
        "why": "使っていない連携を外せば、よそで起きた事故に巻き込まれる経路が減ります。",
        "use": [
          {
            "link": "https://github.com/settings/installations",
            "label": "連携している GitHub Apps"
          },
          {
            "link": "https://github.com/settings/applications",
            "label": "許可した OAuth Apps"
          },
          {
            "cmd": "gh api repos/<owner>/<repo>/keys"
          }
        ],
        "lv": 2
      }
    ],
    "lead": "把握していないものは守れません。まず、使っていないものを片付けます。"
  },
  {
    "id": "access",
    "title": "アカウントと権限",
    "items": [
      {
        "id": "2fa",
        "t": "自分を含め、関わる全員が 2 要素認証（2FA）を使っている（organization なら必須にしている）",
        "risk": "パスワードだけのアカウントは、使い回しやフィッシングで簡単に乗っ取られます。乗っ取られると、コードの書き換えもシークレットの持ち出しもできてしまいます。",
        "why": "2FA があれば、パスワードが漏れただけではログインされません。パスキーやセキュリティキーなら、フィッシングにも強くなります。",
        "use": [
          {
            "text": "自分のアカウントは Settings → Password and authentication で 2FA を有効にします。ホスティングやデータベースなど、ほかのサービスのアカウントも同じです。"
          },
          {
            "link": "https://github.com/settings/security",
            "label": "自分の 2FA の設定"
          },
          {
            "text": "organization なら Settings → Authentication security → Require two-factor authentication で全員に必須にします。必須にすると、2FA を設定していない外部コラボレーターは外され、メンバーは設定するまで organization のリソースを使えなくなるので、先に全員に設定してもらいます。"
          }
        ],
        "lv": 1
      },
      {
        "id": "offboard",
        "t": "抜けた人の権限と、不要な外部コラボレーターを外した",
        "risk": "抜けた人のアカウントに権限が残っていると、そのアカウントが乗っ取られたとき、今も使っているリポジトリまで書き換えられます。本人に悪意がなくても起こります。",
        "why": "抜けるときに権限を外す手順を決めておけば、使われていない権限が溜まりません。",
        "use": [
          {
            "text": "organization なら、外部コラボレーターの一覧を出します。"
          },
          {
            "cmd": "gh api --paginate orgs/<org>/outside_collaborators --jq '.[].login'"
          },
          {
            "text": "個人アカウントのリポジトリなら、リポジトリごとのコラボレーターを確かめます。"
          },
          {
            "cmd": "gh api --paginate repos/<owner>/<repo>/collaborators --jq '.[].login'"
          }
        ],
        "lv": 1
      },
      {
        "id": "admins",
        "t": "organization の基本権限を Read 以下にし、Owner を必要な人だけにした",
        "risk": "Owner は organization の削除や設定の変更、シークレットの差し替えまでできます。Owner が多いほど、そのうち誰かが乗っ取られる可能性が上がります。",
        "why": "普段の作業は書き込み権限で足ります。Owner を絞れば、1 人が乗っ取られたときの被害を小さくできます。",
        "use": [
          {
            "cmd": "gh api --paginate 'orgs/<org>/members?role=admin' --jq '.[].login'"
          }
        ],
        "lv": 2
      },
      {
        "id": "tokens",
        "t": "期限のない personal access token を使っていない",
        "risk": "期限のないトークンは、どこかに置き忘れたり漏れたりすると、気づくまでずっと使われ続けます。classic のトークンは、全リポジトリへの広い権限を持ちがちです。",
        "why": "期限と権限を絞っておけば、漏れても被害の範囲と期間が限られます。",
        "use": [
          {
            "link": "https://github.com/settings/personal-access-tokens",
            "label": "fine-grained のトークン一覧"
          },
          {
            "link": "https://github.com/settings/tokens",
            "label": "classic のトークン一覧"
          }
        ],
        "lv": 2
      }
    ]
  },
  {
    "id": "secrets",
    "title": "シークレットと API キー",
    "items": [
      {
        "id": "pushprot",
        "t": "キーを含むコミットを、push の前に止める仕組みがある",
        "risk": "API キーやパスワードをうっかりコミットして公開すると、数分で自動収集されて悪用されることがあります。クラウドの高額請求やデータの持ち出しにつながります。",
        "why": "push protection は、キーを含む push をその場で止めます。secret scanning は、すでに入ってしまったキーを見つけます。",
        "use": [
          {
            "cmd": "gh api -X PATCH repos/<owner>/<repo> \\\n  -f 'security_and_analysis[secret_scanning][status]=enabled' \\\n  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'"
          }
        ],
        "lv": 1,
        "alt": {
          "text": "非公開リポジトリでは push protection が有料です（GitHub Secret Protection）。代わりに、gitleaks をコミットの前に動かして止めます。pre-commit を入れて（pip install pre-commit など）、リポジトリの直下に .pre-commit-config.yaml を置き、各自の手元で pre-commit install を一度実行します。",
          "cmd": "repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: v8.30.1\n    hooks:\n      - id: gitleaks"
        }
      },
      {
        "id": "gitleaks",
        "t": "非公開リポジトリも、過去のコミット履歴までキーが残っていないか調べた",
        "risk": "ファイルから消したキーも、コミット履歴には残っています。非公開リポジトリを公開に切り替えたときや、メンバーの PC から漏れたときに、まとめて他人の目に触れます。",
        "why": "非公開リポジトリでは GitHub の secret scanning が有料なので、無料のツールで履歴まで調べます。",
        "use": [
          {
            "cmd": "gitleaks git -v --redact ."
          },
          {
            "link": "https://github.com/gitleaks/gitleaks",
            "label": "gitleaks"
          }
        ],
        "lv": 2
      },
      {
        "id": "clientenv",
        "t": "ブラウザに届く環境変数に、秘密の値を入れていない",
        "risk": "NEXT_PUBLIC_ や VITE_ で始まる環境変数は、ビルドのときにページの JavaScript へ埋め込まれます。秘密のキーを入れると、ページを開いた誰でも読めます。",
        "why": "ブラウザに渡してよい値と、サーバーだけで使う値を分けておけば、知らないうちに公開してしまうことを防げます。",
        "use": [
          {
            "cmd": "grep -rnE '(NEXT_PUBLIC|VITE|EXPO_PUBLIC)_[A-Z0-9_]*(SECRET|TOKEN|PRIVATE|KEY|PASSWORD|SERVICE_ROLE)' \\\n  --exclude-dir={node_modules,.next,dist,build} ."
          },
          {
            "text": "Firebase の apiKey や Supabase の anon（publishable）キーのように、ブラウザに出してよいキーも見つかります。見つかったものが本当に秘密の値かを確かめます。"
          }
        ],
        "lv": 2
      },
      {
        "id": "paidapi",
        "t": "従量課金の API キーに、使える場所の制限と利用上限を付けた",
        "risk": "地図や生成 AI、メール送信などの API キーが漏れたり、ブラウザから抜き取られたりすると、他人に使われて高額な請求が届きます。ブラウザで使うキーは、ページを開いた誰でも見られます。",
        "why": "キーに使えるドメインや IP アドレスの制限を付け、利用上限や予算アラートを設定しておけば、漏れても被害を小さく抑えられ、早く気づけます。",
        "use": [
          {
            "text": "Google Cloud なら、API キーの制限と、API ごとの割り当て（quota）の上限を設定します。予算アラートは通知だけで、使用は止まりません。生成 AI の API なら、各サービスの管理画面で利用上限を設定します。"
          }
        ],
        "lv": 1
      },
      {
        "id": "rotate",
        "t": "キーが漏れたら「まず失効させる」と決めてある",
        "risk": "漏れたキーを履歴から消すだけで済ませると、すでにコピーした人はそのまま使い続けられます。値を Issue やチャットに貼ると、そこからまた漏れます。",
        "why": "失効させれば、漏れたキーは使えなくなります。手順を先に決めておけば、慌てずに済みます。",
        "use": [
          {
            "text": "使っているキーごとに、発行した場所（管理画面）、失効と再発行の手順、差し替える場所（環境変数やデプロイ先の Secrets）を一覧にしておきます。一覧ができていれば完了です。"
          }
        ],
        "lv": 1
      }
    ]
  },
  {
    "id": "deps",
    "title": "依存パッケージ",
    "items": [
      {
        "id": "dependabot",
        "t": "Dependabot alerts を有効にした",
        "risk": "使っているパッケージに既知の脆弱性があっても、有効にしていなければ誰にも知らされません。攻撃する側は、公開された脆弱性の情報をもとに古いままのサイトを狙います。",
        "why": "有効にすると、該当するパッケージと直し方が届きます。非公開リポジトリでも無料です。",
        "use": [
          {
            "cmd": "gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts"
          }
        ],
        "lv": 1
      },
      {
        "id": "secupdates",
        "t": "Dependabot security updates で、修正 PR が自動で届くようにした",
        "risk": "通知が届いても、手で直す手間がかかると後回しになり、その間ずっと穴が開いたままになります。",
        "why": "修正 PR が自動で届けば、確認してマージするだけで済みます。",
        "use": [
          {
            "cmd": "gh api -X PUT repos/<owner>/<repo>/automated-security-fixes"
          }
        ],
        "lv": 2
      },
      {
        "id": "lockfile",
        "t": "lockfile をコミットしている",
        "risk": "lockfile がないと、インストールのたびに違うバージョンが入ることがあります。本番でどのバージョンが動いているかわからず、脆弱性の影響を受けるかどうかも判断できません。",
        "why": "入るバージョンが固定され、脆弱性の通知とも正しく照らし合わせられます。",
        "use": [
          {
            "text": "package-lock.json、pnpm-lock.yaml、uv.lock など"
          }
        ],
        "lv": 2
      },
      {
        "id": "cooldown",
        "t": "公開されたばかりの版は、数日待ってから入れるようにした",
        "risk": "人気のパッケージが乗っ取られ、悪意あるコードを含む版が公開される事件が続いています。公開直後の版を入れると、インストールしただけでキーなどを盗まれることがあります。",
        "why": "悪意ある版の多くは、数時間から数日で見つかって取り下げられます。数日待つだけで、ほとんどを避けられます。",
        "use": [
          {
            "text": "npm の min-release-age、pnpm の minimumReleaseAge、Renovate の minimumReleaseAge、Dependabot の cooldown で、待つ日数を設定できます。"
          }
        ],
        "lv": 3
      },
      {
        "id": "osv",
        "t": "手元や CI で、依存パッケージの脆弱性を調べられるようにした",
        "risk": "Dependabot が見ていない場所（GitHub 以外のリポジトリや、手元での作業中）では、脆弱性のあるパッケージを入れても気づけません。",
        "why": "GitHub の脆弱性情報も取り込んだ OSV のデータベースを使って、Dependabot を使えない場所でも確かめられます。",
        "use": [
          {
            "cmd": "osv-scanner scan source -r ."
          },
          {
            "link": "https://google.github.io/osv-scanner/",
            "label": "OSV-Scanner"
          }
        ],
        "lv": 3
      }
    ]
  },
  {
    "id": "code",
    "title": "コード",
    "items": [
      {
        "id": "codeql",
        "t": "コードの静的解析を、push のたびに自動で動かしている",
        "risk": "SQL インジェクションやクロスサイトスクリプティングのような典型的な穴は、書いた本人もレビューした人も見落としがちです。",
        "why": "push のたびに自動で調べ、よくある穴を指摘してくれます。",
        "use": [
          {
            "cmd": "gh api -X PATCH repos/<owner>/<repo>/code-scanning/default-setup \\\n  -f state=configured"
          }
        ],
        "lv": 2,
        "alt": {
          "text": "非公開リポジトリでは CodeQL が有料です（GitHub Code Security）。代わりに、Semgrep の無料版を手元や CI で動かします。",
          "cmd": "semgrep scan --config auto"
        }
      },
      {
        "id": "aireview",
        "t": "PR ごとに AI のセキュリティレビューを通している",
        "cost": "api",
        "risk": "「ログインしていれば他人のデータも見られる」といった認可の漏れは、決まったルールで調べるツールではなかなか見つかりません。",
        "why": "AI はコードの意図を読んで、こうした穴も指摘できることがあります。見落としや誤りもあるので、人のレビューの代わりにはなりません。新しく入る穴を止める役なので、今ある穴は別に調べます。",
        "use": [
          {
            "link": "https://github.com/anthropics/claude-code-security-review",
            "label": "claude-code-security-review"
          },
          {
            "text": "手元なら Claude Code の /security-review"
          },
          {
            "text": "公開リポジトリでは、外部からの PR を AI に読ませると操られるおそれがあります。Settings → Actions → General で、外部のコントリビューターからの実行に承認を必須にします。"
          }
        ],
        "lv": 3
      }
    ]
  },
  {
    "id": "auth",
    "title": "ログイン機能",
    "items": [
      {
        "id": "authz",
        "t": "ログインした人が、他人のデータを見たり変えたりできないことを確かめた",
        "risk": "URL や API の ID を書き換えるだけで他人の登録情報が見えてしまう穴は、Web アプリでいちばん多い脆弱性の一つです。ログイン画面があっても、データごとに「誰のものか」を確かめていなければ防げません。",
        "why": "データを返すときと書き換えるときに、毎回サーバー側で持ち主を確かめれば、ID を推測されても他人のデータには届きません。",
        "use": [
          {
            "text": "テスト用のアカウントを 2 つ作り、片方でログインしたまま、もう片方のデータの URL や ID を直接開いて、見えないことを確かめます。"
          },
          {
            "text": "Claude Code の /security-review でも、こうした認可の漏れを探せます。"
          }
        ],
        "lv": 1
      },
      {
        "id": "authimpl",
        "t": "パスワードの保存やログインの仕組みを自前で作っていない",
        "risk": "パスワードをそのまま、または弱い方法で保存していると、データベースが漏れたときに全員のパスワードが読まれます。同じパスワードを使い回している人は、ほかのサービスまで危なくなります。",
        "why": "実績のある認証サービスやライブラリを使えば、パスワードの安全な保存、総当たりへの対策、2FA などをまとめて任せられます。",
        "use": [
          {
            "text": "Firebase Authentication、Supabase Auth、Auth.js、Clerk など。Auth.js なら、パスワードを自分で扱う Credentials ではなく、外部のアカウントでのログインを使います。"
          }
        ],
        "lv": 2
      }
    ],
    "lead": "ログイン画面があることと、データが守られていることは別の話です。"
  },
  {
    "id": "input",
    "title": "利用者からの入力",
    "items": [
      {
        "id": "form",
        "t": "入力フォームに、bot 対策と送信回数の制限を入れた",
        "risk": "誰でも送れるフォームは bot に狙われ、大量のスパムが届いたり、通知メールの送信やデータベースの容量で費用が膨らんだりします。入力欄に攻撃用の文字列を送り込まれることもあります。",
        "why": "bot 対策と、同じ送信元からの回数制限を入れれば、自動の大量送信を止められます。入力された値は、ブラウザ側だけでなくサーバー側でも必ず確かめます。",
        "use": [
          {
            "text": "Cloudflare Turnstile などの bot 対策と、ホスティングやフレームワークの回数制限（レート制限）の機能"
          }
        ],
        "lv": 2
      },
      {
        "id": "ugc",
        "t": "利用者が書いた内容を、HTML として解釈させずに表示している",
        "risk": "投稿にスクリプトを紛れ込ませられると、それを見たほかの利用者のブラウザで実行され、ログイン中のアカウントを乗っ取られたり、偽の画面を出されたりします（クロスサイトスクリプティング）。",
        "why": "表示するときに必ずエスケープすれば、投稿はただの文字として表示されます。React や Vue は標準でエスケープしますが、HTML をそのまま差し込む書き方をしている箇所は要注意です。",
        "use": [
          {
            "text": "HTML をそのまま差し込んでいる箇所を探します。"
          },
          {
            "cmd": "grep -rnE 'dangerouslySetInnerHTML|v-html|innerHTML' \\\n  --exclude-dir=node_modules ."
          }
        ],
        "lv": 2
      },
      {
        "id": "upload",
        "t": "アップロードできるファイルの種類と大きさを制限し、保存先を非公開にした",
        "risk": "何でもアップロードできると、不正なファイルを置かれて配布に使われたり、HTML や SVG に仕込んだスクリプトを実行されたりします。保存先が公開設定だと、ほかの人が上げた書類まで誰でも見られます。",
        "why": "受け付ける種類と大きさを決め、保存先を非公開にして、見る権限のある人にだけ期限付きの URL で渡せば、これらを防げます。",
        "use": [
          {
            "text": "Firebase Storage のセキュリティルール、Supabase Storage のポリシー、S3 や R2 の署名付き URL"
          }
        ],
        "lv": 2
      },
      {
        "id": "ai",
        "t": "生成 AI に渡すデータと権限を絞った",
        "risk": "利用者の入力や読み込ませた文書に「これまでの指示を無視して…」と書かれていると、AI が操られ、見せるべきでない情報を出したり、つないだ機能を勝手に使ったりします（プロンプトインジェクション）。入力した個人情報が外部の AI サービスに送られることも見落とされがちです。",
        "why": "AI に渡すのは必要なデータだけにし、AI の出力でデータの書き換えやメール送信などを直接行わないようにすれば、操られても被害が広がりにくくなります。",
        "use": [
          {
            "text": "使っている AI サービスで、送ったデータが学習に使われるかを確かめ、送る前に個人情報を取り除きます。"
          }
        ],
        "lv": 2
      }
    ],
    "lead": "外から入ってくるものは、すべて疑ってかかります。"
  },
  {
    "id": "storage",
    "title": "データベースとストレージ",
    "items": [
      {
        "id": "dbnet",
        "t": "データベースにインターネットから直接つながらないようにした",
        "risk": "データベースがインターネットに公開されていると、弱いパスワードや既知の脆弱性を狙った自動の攻撃を受け続けます。見つかると、中身を丸ごと持ち出されたり、消されたりします。",
        "why": "アプリのサーバーなど、必要な接続元だけに絞れば、攻撃の入口そのものがなくなります。アプリが使うデータベースのユーザーも、必要な権限だけにしておきます。",
        "use": [
          {
            "text": "クラウドの管理画面で、データベースの公開設定と、接続を許可する IP アドレスを確かめます。自分の PC から次のコマンドを実行して、つながらないことも確かめます（5432 は PostgreSQL のポートです。MySQL なら 3306 にします）。"
          },
          {
            "cmd": "nc -vz <データベースのホスト名> 5432"
          },
          {
            "text": "Supabase なら、ダッシュボードの Network Restrictions で、データベースに直接つなげる接続元を絞れます。ブラウザから使う API はこの対象外なので、そちらは RLS で守ります。"
          }
        ],
        "lv": 1
      },
      {
        "id": "backup",
        "t": "データベースのバックアップを取り、そこから戻せることを試した",
        "risk": "誤って消したり、乗っ取られて消されたり暗号化されたりしたとき、バックアップがなければ元に戻せません。取っていても戻し方を試していないと、いざというときに使えないことがあります。",
        "why": "定期的なバックアップと戻せることの確認があれば、最悪の場合でもデータを取り戻せます。バックアップは本番とは別の場所と権限で保管します。",
        "use": [
          {
            "text": "マネージドサービスなら、自動バックアップの設定を確かめます。無料プランでは自動バックアップがないことがあります（Supabase の無料プランにはなく、supabase db dump で自分で書き出すよう案内されています）。自前のデータベースなら pg_dump や mysqldump を定期的に実行し、ときどき別の環境に戻してみます。"
          }
        ],
        "lv": 2
      },
      {
        "id": "firebase",
        "t": "Firebase のセキュリティルールが、誰でも読み書きできる設定になっていない",
        "risk": "試作のときの allow read, write: if true; が本番に残っていると、プロジェクトの ID を知っている誰でも、登録された個人情報を全件読んだり書き換えたりできます。ID はページを開けば見えます。ログインしていれば誰でも許す if request.auth != null; も、アカウントを作れば誰でも全件を読めるので同じです。",
        "why": "ルールで「本人のデータだけ」に絞れば、アプリを通さない直接のアクセスも防げます。",
        "use": [
          {
            "text": "Firebase コンソールのルール画面と、エミュレータでのルールのテスト"
          }
        ],
        "lv": 1
      },
      {
        "id": "supabase",
        "t": "Supabase の公開しているスキーマ（public など）の全テーブルで、RLS（行ごとのアクセス制御）を有効にした",
        "risk": "RLS が無効なテーブルは、ブラウザに埋め込まれた anon キー（新しいプロジェクトでは publishable キー）を使えば、誰でも全件を読み書きできます。このキーはページを開けば見えます。",
        "why": "RLS を有効にしてポリシーを書けば、キーが見えていても許可した行しか読めません。service_role キー（新しい secret キー）は RLS を無視するので、ブラウザのコードや NEXT_PUBLIC_ の変数には入れません。",
        "use": [
          {
            "text": "ダッシュボードの Security Advisor"
          }
        ],
        "lv": 1
      },
      {
        "id": "share",
        "t": "スプレッドシートやストレージが「リンクを知っていれば誰でも見られる」になっていない",
        "risk": "申込フォームの回答シートやアップロードされたファイルがこの設定のままだと、リンクが転送されたり検索に載ったりした時点で、個人情報が誰にでも見える状態になります。",
        "why": "共有範囲を関係者だけに絞れば、リンクが漏れても中身は見えません。",
        "use": [
          {
            "text": "Google ドライブの共有設定、S3・Cloud Storage・R2 のバケットの公開設定"
          }
        ],
        "lv": 2
      }
    ],
    "lead": "漏えいの多くは、コードではなく「データが誰から見えるか」の設定で起きます。"
  },
  {
    "id": "privacy",
    "title": "個人情報",
    "items": [
      {
        "id": "sensitive",
        "t": "健康・福祉・子どもなどの情報は、本当に必要なときだけ集め、見られる人を絞っている",
        "risk": "病歴や障害、子どもの情報が漏れると、本人への影響が大きく取り返しがつきません。病歴や障害などの要配慮個人情報は、1 人分の漏えい（そのおそれを含む）でも、原則として個人情報保護委員会への報告と本人への通知が必要です。",
        "why": "集めなければ漏れません。集めるときは本人の同意を取り（要配慮個人情報では原則として必要です）、見られる人を最小限にし、保存期間を決めます。",
        "use": [
          {
            "text": "フォームの項目ごとに、本当に必要かを関係者と見直します。"
          }
        ],
        "lv": 1
      },
      {
        "id": "logs",
        "t": "個人情報をログやエラー通知に出していない",
        "risk": "エラー通知やサーバーのログに氏名や住所が入ると、本来そのデータを見る権限のない人や外部サービスにも渡ります。",
        "why": "ログに個人情報を出さなければ、漏れうる場所を本体のデータベースだけに絞れます。",
        "use": [
          {
            "text": "Sentry の Data Scrubbing、ログに出す値の見直し"
          }
        ],
        "lv": 3
      },
      {
        "id": "minimize",
        "t": "集める個人情報を最小限にし、保存期間を決めた",
        "risk": "使わない個人情報まで集めて期限なく持ち続けると、漏れたときの被害が大きくなり、説明やお詫びをする範囲も広がります。",
        "why": "持っていないデータは漏れません。集める項目と保存期間を決めるのが、いちばん手間のかからない対策です。",
        "use": [
          {
            "text": "フォームの項目ごとに「何に使うか」を書き出し、答えられない項目は消します。"
          }
        ],
        "lv": 2
      }
    ],
    "lead": "市民の情報を扱うなら、ここがいちばん大事です。"
  },
  {
    "id": "infra",
    "title": "ドメインとサーバー",
    "items": [
      {
        "id": "dns",
        "t": "ドメインと DNS レコードの一覧があり、使っていないサブドメインのレコードを消した",
        "risk": "削除したサービスを指したままの DNS レコードがあると、第三者が同じ名前でサービスを作り、自分たちのドメインで偽のページを出せます（サブドメインの乗っ取り）。",
        "why": "使っていないレコードを消せば、乗っ取りの入口がなくなります。",
        "use": [
          {
            "text": "DNS の管理画面でレコードを書き出し、指している先がまだあるか確かめます。"
          }
        ],
        "lv": 2
      },
      {
        "id": "mailauth",
        "t": "独自ドメインに SPF・DKIM・DMARC を設定した",
        "risk": "設定がないと、第三者がそのドメインを名乗ってメールを送れます。プロジェクトを名乗った偽の案内で、利用者がだまされます。",
        "why": "SPF・DKIM を設定し、DMARC を p=quarantine か p=reject にすれば、受け取る側がなりすましを見分けて弾けます（p=none は報告だけです）。メールを送らないドメインなら、SPF に v=spf1 -all、DMARC に p=reject を設定します。",
        "use": [
          {
            "text": "SPF と DMARC の設定は、次のコマンドで確かめられます。"
          },
          {
            "cmd": "dig +short TXT <ドメイン>\ndig +short TXT _dmarc.<ドメイン>"
          }
        ],
        "lv": 2
      },
      {
        "id": "server",
        "t": "サーバーの OS とソフトウェアを自動で更新し、SSH は鍵だけでログインできるようにした",
        "risk": "インターネットに公開されたサーバーには、SSH へのパスワード総当たりや、既知の脆弱性を狙った攻撃が常に来ます。更新が止まったサーバーは乗っ取られ、ほかへの攻撃の踏み台に使われます。",
        "why": "セキュリティ更新を自動で入れ、SSH のパスワードでのログインを止めて鍵だけにすれば、よくある攻撃の多くを防げます。使わないポートはファイアウォールで閉じます。",
        "use": [
          {
            "text": "Ubuntu なら、セキュリティ更新の自動適用（unattended-upgrades）は最初から入っていて有効です。入っていなければ次のコマンドで入れます。"
          },
          {
            "cmd": "sudo apt install unattended-upgrades"
          },
          {
            "text": "SSH は、鍵でログインできることを確かめてから、/etc/ssh/sshd_config.d/00-no-password.conf に PasswordAuthentication no と書き、sudo systemctl restart ssh で反映します。次のコマンドで no と出れば完了です。"
          },
          {
            "cmd": "sudo sshd -T | grep -i passwordauthentication"
          }
        ],
        "lv": 2
      }
    ]
  },
  {
    "id": "ci",
    "title": "GitHub Actions とリポジトリの設定",
    "items": [
      {
        "id": "perm",
        "t": "ワークフローの GITHUB_TOKEN を読み取り専用にした",
        "risk": "GITHUB_TOKEN が書き込み可のままだと、ワークフローで使っている外部の action が乗っ取られたとき、その action からリポジトリに勝手に push されるおそれがあります。",
        "why": "読み取り専用にしておけば、乗っ取られた action にできることが限られます。書き込みが必要なジョブだけに許可を付けます。",
        "use": [
          {
            "text": "Settings → Actions → General → Workflow permissions を Read にします。各ワークフローの先頭にも permissions: contents: read を書きます。"
          }
        ],
        "lv": 1
      },
      {
        "id": "pin",
        "t": "外部の action をコミットの SHA で固定した",
        "risk": "action のタグ（v4 など）は、後から別のコードに付け替えられます。2025 年の tj-actions/changed-files の改ざんでは、タグで参照していた多くのリポジトリで、シークレットがログに流出しました。",
        "why": "コミットの SHA は書き換えられないので、確認した版だけが動きます。",
        "use": [
          {
            "cmd": "pinact run"
          },
          {
            "link": "https://github.com/suzuki-shunsuke/pinact",
            "label": "pinact"
          }
        ],
        "lv": 2
      },
      {
        "id": "zizmor",
        "t": "ワークフローの危ない書き方を検査した",
        "risk": "Issue のタイトルや PR のブランチ名を run にそのまま埋め込むと、外部の人がその文字列でコマンドを実行できます。pull_request_target を誤って使うと、フォークからの PR にシークレットを渡してしまいます。",
        "why": "zizmor はこうした危ない書き方を見つけ、直し方も示します。",
        "use": [
          {
            "cmd": "uvx zizmor ."
          },
          {
            "link": "https://docs.zizmor.sh/",
            "label": "zizmor"
          }
        ],
        "lv": 3
      },
      {
        "id": "ruleset",
        "t": "main への直接の push と force push を禁止した",
        "risk": "1 人のアカウントが乗っ取られただけで、レビューなしに本番のコードを書き換えられます。force push されると、元の履歴まで消されます。",
        "why": "main への変更に PR と 1 人以上の承認を求めれば、1 人のアカウントが乗っ取られても、ほかの人の目を通さずには書き換えられません。1 人で開発しているなら、force push と削除の禁止だけでも設定します。",
        "use": [
          {
            "text": "Settings → Rules → Rulesets で設定します。非公開リポジトリでは、GitHub Free では使えません（Pro・Team 以上）。"
          }
        ],
        "lv": 2
      },
      {
        "id": "scorecard",
        "t": "OpenSSF Scorecard でリポジトリの設定をまとめて確かめた",
        "risk": "ブランチ保護やトークンの権限といったリポジトリの設定の穴は、1 つずつ画面を開かないと気づけません。",
        "why": "Scorecard は設定をまとめて調べ、項目ごとの点数と直し方を示します。",
        "use": [
          {
            "cmd": "GITHUB_AUTH_TOKEN=$(gh auth token) scorecard --repo=github.com/<owner>/<repo>"
          },
          {
            "link": "https://github.com/ossf/scorecard",
            "label": "OpenSSF Scorecard"
          }
        ],
        "lv": 3
      }
    ]
  },
  {
    "id": "response",
    "title": "報告の受け付けと対応",
    "items": [
      {
        "id": "disclosure",
        "t": "脆弱性は非公開の場所で扱い、公開の Issue には書かないと決めてある",
        "risk": "公開リポジトリの Issue に脆弱性を書くと、直す前に攻撃の手順を誰にでも見える形で公開することになります。",
        "why": "非公開の場所で扱えば、直してから公表できます。",
        "use": [
          {
            "text": "GitHub の Security Advisory の下書き、または非公開のリポジトリ"
          }
        ],
        "lv": 1
      },
      {
        "id": "pvr",
        "t": "SECURITY.md を置き、非公開の脆弱性報告（private vulnerability reporting）を有効にした",
        "risk": "穴を見つけた人に知らせる手段がないと、公開の Issue や SNS に書かれてしまうか、誰にも知らされないままになります。",
        "why": "非公開で報告できる窓口があれば、見つけてくれた人と安全にやり取りできます。",
        "use": [
          {
            "cmd": "gh api -X PUT repos/<owner>/<repo>/private-vulnerability-reporting"
          }
        ],
        "lv": 2
      },
      {
        "id": "contact",
        "t": "インシデントのとき、誰が判断して誰に連絡するかが決まっている",
        "risk": "漏えいが起きてから「誰が止めるのか」「どこに連絡するのか」を決めていると、その間も被害が広がります。自治体などと組んでいる場合、報告の遅れはそのまま信頼の問題になります。",
        "why": "判断する人と連絡先を先に決めておけば、最初の 1 時間で動けます。個人情報が漏れた場合は、個人情報保護委員会への報告と本人への通知が必要になることがあります。",
        "use": [
          {
            "text": "判断する人と連絡先を 1 枚にまとめ、README から辿れるようにします。"
          }
        ],
        "lv": 2
      }
    ]
  }
];

// ---- 資料。REFS は項目ごとの関連資料、RECOMMENDED はページの最後に載せるおすすめ ----
const GH = "https://docs.github.com/ja/";
const SOURCES = {
  ghArchive: ["GitHub Docs「リポジトリのアーカイブ」", GH + "repositories/archiving-a-github-repository/archiving-repositories", "github"],
  ghApps: ["GitHub Docs「インストールされている GitHub App の確認と変更」", GH + "apps/using-github-apps/reviewing-and-modifying-installed-github-apps", "github"],
  ghDeployKeys: ["GitHub Docs「デプロイキーの管理」", GH + "authentication/connecting-to-github-with-ssh/managing-deploy-keys", "github"],
  ghPersonal2fa: ["GitHub Docs「2 要素認証を設定する」", GH + "authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication", "github"],
  gh2fa: ["GitHub Docs「Organization で 2 要素認証を必須にする」", GH + "organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization", "github"],
  ghOutside: ["GitHub Docs「Organization のリポジトリから外部コラボレーターを削除する」", GH + "organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/removing-an-outside-collaborator-from-an-organization-repository", "github"],
  ghDataLeaks: ["GitHub Docs「Organization でのデータ漏えいを防ぐためのベストプラクティス」", GH + "code-security/getting-started/best-practices-for-preventing-data-leaks-in-your-organization", "github"],
  ghPat: ["GitHub Docs「個人用アクセストークンを管理する」", GH + "authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens", "github"],
  ghDependabot: ["GitHub Docs「Dependabot アラート」", GH + "code-security/dependabot/dependabot-alerts/about-dependabot-alerts", "github"],
  ghSecUpdates: ["GitHub Docs「Dependabot セキュリティアップデート」", GH + "code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates", "github"],
  ghSecretScanning: ["GitHub Docs「シークレットスキャンについて」", GH + "code-security/secret-scanning/introduction/about-secret-scanning", "github"],
  ghPushProtection: ["GitHub Docs「プッシュ保護について」", GH + "code-security/secret-scanning/introduction/about-push-protection", "github"],
  ghCodeql: ["GitHub Docs「コードスキャンの既定のセットアップの構成」", GH + "code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning", "github"],
  ghPricing: ["GitHub Changelog「Introducing GitHub Secret Protection and GitHub Code Security」（2025-03-04）", "https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/", "github"],
  ghToken: ["GitHub Docs「自動トークン認証」（GITHUB_TOKEN）", GH + "actions/security-for-github-actions/security-guides/automatic-token-authentication", "github"],
  ghHardening: ["GitHub Docs「GitHub Actions のセキュリティ強化」", GH + "actions/security-for-github-actions/security-guides/security-hardening-for-github-actions", "github"],
  ghRulesets: ["GitHub Docs「ルールセットについて」", GH + "repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets", "github"],
  ghPvr: ["GitHub Docs「リポジトリの非公開の脆弱性報告の構成」", GH + "code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository", "github"],
  ghPolicy: ["GitHub Docs「リポジトリへのセキュリティポリシーの追加」", GH + "code-security/getting-started/adding-a-security-policy-to-your-repository", "github"],

  firebaseInsecure: ["Firebase「安全でないルールの回避」", "https://firebase.google.com/docs/rules/insecure-rules", "service"],
  firebaseChecklist: ["Firebase「Firebase security checklist」", "https://firebase.google.com/support/guides/security-checklist", "service"],
  firebaseTest: ["Firebase「Security Rules の単体テスト」", "https://firebase.google.com/docs/rules/unit-tests", "service"],
  supabaseRls: ["Supabase Docs「Row Level Security」", "https://supabase.com/docs/guides/database/postgres/row-level-security", "service"],
  supabaseNet: ["Supabase Docs「Network Restrictions」", "https://supabase.com/docs/guides/platform/network-restrictions", "service"],
  supabaseAdvisors: ["Supabase Docs「Advisors」", "https://supabase.com/docs/guides/database/database-advisors", "service"],
  nextEnv: ["Next.js Docs「How to use environment variables in Next.js」", "https://nextjs.org/docs/app/guides/environment-variables", "service"],
  viteEnv: ["Vite「環境変数とモード」", "https://vite.dev/guide/env-and-mode", "service"],
  pnpmAge: ["pnpm「minimumReleaseAge」", "https://pnpm.io/settings#minimumreleaseage", "service"],
  renovateAge: ["Renovate Docs「minimumReleaseAge」", "https://docs.renovatebot.com/configuration-options/#minimumreleaseage", "service"],
  sentryScrub: ["Sentry Docs「Data Scrubbing」", "https://docs.sentry.io/security-legal-pii/scrubbing/", "service"],
  driveShare: ["Google ドライブ ヘルプ「Google ドライブのファイルを共有する」", "https://support.google.com/drive/answer/2494822", "service"],

  openssfGuide: ["OpenSSF「Concise Guide for Developing More Secure Software」", "https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software", "guide"],
  ipaWeb: ["IPA「安全なウェブサイトの作り方」", "https://www.ipa.go.jp/security/vuln/websecurity/about.html", "guide"],
  ppcLeak: ["個人情報保護委員会「漏えい等の対応とお役立ち資料」", "https://www.ppc.go.jp/personalinfo/legal/leakAction/", "guide"],
  owaspMfa: ["OWASP Cheat Sheet「Multifactor Authentication」", "https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html", "guide"],
  owaspSecrets: ["OWASP Cheat Sheet「Secrets Management」", "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html", "guide"],
  owaspLogging: ["OWASP Cheat Sheet「Logging」", "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html", "guide"],
  owaspVdp: ["OWASP Cheat Sheet「Vulnerability Disclosure」", "https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html", "guide"],
  owaspTakeover: ["OWASP WSTG「Test for Subdomain Takeover」", "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/10-Test_for_Subdomain_Takeover", "guide"],

  owaspTop10: ["OWASP Top 10:2025「A01 Broken Access Control」", "https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/", "guide"],
  owaspAuthz: ["OWASP Cheat Sheet「Authorization」", "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html", "guide"],
  owaspAuthn: ["OWASP Cheat Sheet「Authentication」", "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html", "guide"],
  owaspPassword: ["OWASP Cheat Sheet「Password Storage」", "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html", "guide"],
  owaspDb: ["OWASP Cheat Sheet「Database Security」", "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html", "guide"],
  cisaRansomware: ["CISA「#StopRansomware Guide」", "https://www.cisa.gov/stopransomware/ransomware-guide", "guide"],

  gcpKeys: ["Google Cloud「API キーの管理に関するベストプラクティス」", "https://cloud.google.com/docs/authentication/api-keys-best-practices", "service"],
  gcpBudgets: ["Google Cloud「予算と予算アラートの作成、編集、削除」", "https://cloud.google.com/billing/docs/how-to/budgets", "service"],
  turnstile: ["Cloudflare Turnstile docs", "https://developers.cloudflare.com/turnstile/", "service"],
  gmailSender: ["Gmail ヘルプ「メール送信者のガイドライン」", "https://support.google.com/a/answer/81126", "service"],
  ubuntuUpdates: ["Ubuntu Server documentation「Automatic updates」", "https://documentation.ubuntu.com/server/how-to/software/automatic-updates/", "service"],
  owaspApi4: ["OWASP API Security Top 10「API4:2023 Unrestricted Resource Consumption」", "https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/", "guide"],
  owaspInput: ["OWASP Cheat Sheet「Input Validation」", "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html", "guide"],
  owaspXss: ["OWASP Cheat Sheet「Cross Site Scripting Prevention」", "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html", "guide"],
  owaspUpload: ["OWASP Cheat Sheet「File Upload」", "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html", "guide"],
  owaspLlm: ["OWASP Gen AI Security Project「LLM01:2025 Prompt Injection」", "https://genai.owasp.org/llmrisk/llm01-prompt-injection/", "guide"],
  ppcGuideline: ["個人情報保護委員会「個人情報の保護に関する法律についてのガイドライン（通則編）」", "https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/", "guide"],

  owaspTop10Index: ["OWASP Top 10:2025", "https://owasp.org/Top10/2025/", "guide"],
  owaspCs: ["OWASP Cheat Sheet Series", "https://cheatsheetseries.owasp.org/", "guide"],

  tjAdvisory: ["GitHub Advisory Database「tj-actions/changed-files」（CVE-2025-30066）", "https://github.com/advisories/GHSA-mrrh-fwg8-r2c3", "incident"],
  tjCisa: ["CISA「Supply Chain Compromise of Third-Party tj-actions/changed-files」（2025-03-18）", "https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction", "incident"],
  npmCisa: ["CISA「Widespread Supply Chain Compromise Impacting npm Ecosystem」（2025-09-23）", "https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem", "incident"],

  osv: ["OSV-Scanner", "https://google.github.io/osv-scanner/", "tool"],
  gitleaks: ["gitleaks", "https://github.com/gitleaks/gitleaks", "tool"],
  semgrep: ["Semgrep Docs「Quickstart」", "https://semgrep.dev/docs/getting-started/quickstart", "tool"],
  zizmor: ["zizmor", "https://docs.zizmor.sh/", "tool"],
  pinact: ["pinact", "https://github.com/suzuki-shunsuke/pinact", "tool"],
  scorecard: ["OpenSSF Scorecard", "https://github.com/ossf/scorecard", "tool"],
  allstar: ["OpenSSF Allstar", "https://github.com/ossf/allstar", "tool"],
  ccsr: ["claude-code-security-review", "https://github.com/anthropics/claude-code-security-review", "tool"],
};
// ページの最後に載せる、目的別のおすすめ（一言の理由つき）
const RECOMMENDED = [
  ["基本の手引き", [
    ["ipaWeb", "日本語で読める定番です。Web アプリによくある脆弱性と、作り方での防ぎ方を体系的に学べます。"],
    ["owaspTop10Index", "Web アプリで実際に多い危険を 10 に絞った世界的な指標です。何から気にすべきかの優先順位がつかめます。"],
    ["owaspCs", "ログインやファイルのアップロードなど、テーマごとにやるべきことが短くまとまっています。作りながら引く辞書として便利です。"],
    ["openssfGuide", "オープンソースで開発する人向けに、やるべきことが 1 ページにまとまっています。公開リポジトリで開発するなら最初に読みたい資料です。"],
  ]],
  ["GitHub を使うなら", [
    ["ghHardening", "GitHub Actions の権限、シークレット、外部の action の扱いを公式がまとめています。Actions を使うなら一度は目を通しておきたい資料です。"],
    ["ghDataLeaks", "organization の権限や設定で何を見直せば情報が漏れにくくなるかを、公式の観点で整理しています。"],
  ]],
  ["個人情報を扱うなら", [
    ["ppcLeak", "個人情報が漏れたときに報告が必要かどうかや、その手順を、国の機関の資料で確かめられます。"],
  ]],
  ["実際に起きた事例", [
    ["tjCisa", "広く使われていた action が改ざんされ、アクセスキーや GitHub のトークンなどのシークレットがワークフローのログから読めるようになった事例です。action を SHA で固定する理由がわかります。"],
    ["npmCisa", "自己増殖するワームが 500 以上の npm パッケージを乗っ取り、開発者の GitHub トークンやクラウドの API キーを狙った事例です。公開直後の版をすぐに入れない理由がわかります。"],
  ]],
];
const REFS = {
  paidapi: ["gcpKeys", "gcpBudgets", "owaspApi4"], form: ["turnstile", "owaspInput"], ugc: ["owaspXss", "ipaWeb"], upload: ["owaspUpload"],
  ai: ["owaspLlm"], sensitive: ["ppcGuideline", "ppcLeak"], mailauth: ["gmailSender"], server: ["ubuntuUpdates"],
  dbnet: ["owaspDb", "supabaseNet"], backup: ["owaspDb", "cisaRansomware"], authz: ["owaspTop10", "owaspAuthz"], authimpl: ["owaspAuthn", "owaspPassword"],
  archive: ["ghArchive"], dns: ["owaspTakeover"], apps: ["ghApps", "ghDeployKeys"],
  "2fa": ["ghPersonal2fa", "gh2fa", "owaspMfa", "openssfGuide"], offboard: ["ghOutside", "ghDataLeaks"], admins: ["ghDataLeaks"], tokens: ["ghPat"],
  dependabot: ["ghDependabot"], secupdates: ["ghSecUpdates"], cooldown: ["npmCisa", "pnpmAge", "renovateAge"],
  pushprot: ["ghSecretScanning", "ghPushProtection", "ghPricing", "gitleaks"], gitleaks: ["ghPricing"], clientenv: ["nextEnv", "viteEnv"], rotate: ["owaspSecrets"],
  codeql: ["ghCodeql", "ghPricing", "semgrep", "ipaWeb"],
  perm: ["ghToken", "ghHardening"], pin: ["tjAdvisory", "tjCisa", "ghHardening"], zizmor: ["ghHardening"], ruleset: ["ghRulesets"],
  firebase: ["firebaseChecklist", "firebaseInsecure", "firebaseTest"], supabase: ["supabaseRls", "supabaseAdvisors"], share: ["driveShare"], logs: ["owaspLogging", "sentryScrub"],
  disclosure: ["owaspVdp", "ghPvr"], pvr: ["ghPvr", "ghPolicy"], contact: ["ppcLeak"],
};

const COST = { api: "API の料金がかかる" };

// 優先度。画面には番号ではなく名前（まずやる・次にやる・余裕ができたら）を出す
const LEVELS = [
  [1, "まずやる", "被害が大きく、手間の少ないもの"],
  [2, "次にやる", "続けて運用していくなら"],
  [3, "余裕ができたら", "利用者や関わる人が増えてきたら"],
];

// STEP 1 の選択肢。WHEN にある項目は、そこに挙げた選択肢のどれかを選んだときだけ出す。WHEN にない項目は誰にでも関係する
const TRAITS = [
  ["GitHub とチーム", [
    ["org", "GitHub の organization（org）で運営している"], ["team", "複数人で開発している"],
    ["public", "公開リポジトリがある"], ["private", "非公開リポジトリがある"], ["actions", "GitHub Actions を使っている"],
  ]],
  ["作っているもの", [
    ["frontend", "ブラウザで動く画面（Next.js・Vite など）"], ["auth", "ログイン機能"],
    ["form", "入力フォーム（問い合わせ・申込など）"], ["ugc", "利用者の投稿をほかの人にも見せる機能"],
    ["upload", "ファイルのアップロード"], ["ai", "生成 AI を使った機能"],
  ]],
  ["使っているもの", [
    ["deps", "npm や pip などの外部パッケージ"], ["db", "データベース"], ["firebase", "Firebase"], ["supabase", "Supabase"],
    ["paidapi", "従量課金の API（地図・生成 AI・メール送信など）"], ["deploy", "Vercel・Netlify・クラウドなどのホスティング"],
    ["server", "自前のサーバー（VPS など）"], ["domain", "独自ドメイン"],
  ]],
  ["扱うデータ", [
    ["pii", "氏名や連絡先などの個人情報"], ["sensitive", "健康・福祉・子どもなど、特に配慮が必要な情報"],
    ["share", "スプレッドシートやクラウドストレージで共有しているデータ"],
  ]],
];
const WHEN = {
  deploy: ["deploy"], offboard: ["team", "org"], admins: ["org"],
  pushprot: ["public", "private"], clientenv: ["frontend"], paidapi: ["paidapi", "ai"],
  dependabot: ["deps"], secupdates: ["deps"], lockfile: ["deps"], cooldown: ["deps"], osv: ["deps"],
  codeql: ["public", "private"],
  authz: ["auth"], authimpl: ["auth"],
  form: ["form"], ugc: ["ugc"], upload: ["upload"], ai: ["ai"],
  dbnet: ["db", "supabase"], backup: ["db", "firebase", "supabase"], firebase: ["firebase"], supabase: ["supabase"], share: ["share"],
  sensitive: ["sensitive"], logs: ["pii", "sensitive"], minimize: ["pii", "sensitive", "form"],
  dns: ["domain"], mailauth: ["domain"], server: ["server"],
  perm: ["actions"], pin: ["actions"], zizmor: ["actions"],
  disclosure: ["public"], pvr: ["public"],
};

// JSON は、ページと同じデータから作る
function checklistJson() {
  return {
    schema_version: 1,
    name: "はじめてのセキュリティ点検",
    description: "専任のセキュリティ担当がいないプロジェクト向けのセキュリティ点検。プロジェクトで使っているもの（conditions）を選ぶと、関係する点検項目（items）が決まる。各項目は、対策が済んだ状態を表す一文と、放っておいたときのリスク、対策が必要な理由、使えるツールやコマンドを持つ。",
    language: "ja",
    url: "https://yokinist.github.io/first-security-checkup/",
    license: { content: "CC BY 4.0（https://creativecommons.org/licenses/by/4.0/deed.ja）", code: "MIT" },
    updated: "2026-10-15",
    disclaimer: "よくある穴を減らすための目安で、すべての項目を満たしても安全を保証するものではない。個人情報を多く扱うときや、自治体などと契約して運用するときは、専門家による診断も検討する。",
    how_to_use: [
      "1. 対象のプロジェクトに当てはまる conditions の id をすべて選ぶ。当てはまるか分からないものは利用者に確かめ、確かめられなければ選んでおく",
      "2. items のうち、when が空のもの、または when に手順 1 で選んだ id を 1 つでも含むものが、そのプロジェクトの点検項目になる",
      "3. 点検項目を level の小さい順（1 まずやる → 2 次にやる → 3 余裕ができたら）に確かめる。title の状態になっていれば済み、なっていなければ how の手順で対策する",
      "4. 非公開リポジトリで有料の機能を使う項目は、how_for_private_repos の代わりの手段を使う",
    ],
    fields: {
      "levels[].level": "1・2・3 の優先度。1 が最初に取り組むもの",
      "levels[].label": "優先度の名前。画面ではこの名前で示す",
      "conditions[].id": "プロジェクトの特徴（例: firebase は Firebase を使っている）。items[].when から参照される。items[].id とは別のもので、同じ文字列でも意味は違う",
      "categories[].id": "項目の分類。並び順は画面の表示順",
      "items[].id": "項目の識別子。conditions[].id とは別のもの",
      "items[].title": "対策が済んだ状態を表す一文。チェックリストの確認項目として使える",
      "items[].risk": "対策しないときに起きること",
      "items[].why": "その対策が必要な理由と、何を防げるか",
      "items[].when": "この項目が関係する条件の id。空ならすべてのプロジェクトに関係し、空でなければ挙げた条件のどれか 1 つに当てはまれば関係する",
      "items[].how": "使えるツール・コマンド・手順。command の <owner> はアカウント名や organization 名、<repo> はリポジトリ名、<org> は organization 名、<ドメイン> や <データベースのホスト名> は自分の値に置き換える",
      "items[].how_for_private_repos": "非公開リポジトリでは GitHub の機能が有料になる項目だけにある、無料の代わりの手段",
      "items[].related": "より詳しく知るための公式ドキュメントや公的機関の資料。本文の根拠として一つずつ検証したものではない",
    },
    levels: LEVELS.map(([level, label, description]) => ({ level, label, description })),
    conditions: TRAITS.flatMap(([group, list]) => list.map(([id, label]) => ({ id, group, label }))),
    categories: GROUPS.map(g => ({ id: g.id, title: g.title })),
    items: GROUPS.flatMap(g => g.items.map(it => ({
      id: it.id, category: g.id, level: it.lv, title: it.t, risk: it.risk, why: it.why,
      when: WHEN[it.id] || [],
      how: it.use.map(u => u.cmd ? { command: u.cmd } : u.link ? { title: u.label, url: u.link } : { text: u.text }),
      ...(it.alt ? { how_for_private_repos: { text: it.alt.text, ...(it.alt.cmd ? { command: it.alt.cmd } : {}) } } : {}),
      related: (REFS[it.id] || []).map(k => ({ title: SOURCES[k][0], url: SOURCES[k][1] })),
    }))),
  };
}
