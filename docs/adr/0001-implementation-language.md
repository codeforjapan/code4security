# ADR 0001: 実装の言語を TypeScript にそろえる

## ステータス

提案中
<!-- 意見は https://github.com/codeforjapan/code4security/issues/7 で受け付けている。2026-10-24 を過ぎて異論がなければ、この ADR を直す PR のレビューで承認済みにする -->

## 日付

2026-10-16

## 決定の記録

- 議論した場所: [#7](https://github.com/codeforjapan/code4security/issues/7)（打ち合わせの結論は [yu23ki14 さんのコメント](https://github.com/codeforjapan/code4security/issues/7#issuecomment-6256807089)）
- 決定の場: 未定（この ADR を直す PR のレビュー）
- 承認者: 未定
- 承認日: 未定

## コンテキスト

このプロジェクトでは、次のものをコードで作る。

- **guide**: 項目データ（YAML）の確認と、`checklist.json`・JSON Schema などの書き出し
- **MCP サーバー**: plugin に入れ、エージェントから呼ぶ（条件の推測、項目の抽出、`project.yml` の読み書き、`verify` の実行）（[ADR 0004](0004-repo-role-and-distribution.md)）
- **checker**: GitHub Actions の定期実行で、リポジトリを横断して確かめ、Issue を起票する（[ADR 0007](0007-checker-entry-points.md)）
- 将来の Viewer

取り込む予定のもの（[ADR 0002](0002-import-yokinist-repos.md)）は、言語が分かれている。

- first-security-checkup: Node.js（`export.js`、js-yaml）
- weekly-security-checker: Python（`scan.py` が 500 行ほど、`test_scan.py` が 50 行ほど）

MCP サーバーと checker は、どちらも `verify` を実行する。言語が分かれると、同じ処理を 2 つの言語で持つことになる。まだ取り込み前で、利用者もいない今なら、言語をそろえ直す費用はもっとも小さい。

## 決定

guide・MCP サーバー・checker を、最終的にすべて TypeScript（Node.js）で書く。weekly-security-checker は、Python のまま取り込み（[ADR 0002](0002-import-yokinist-repos.md)）、そのあと小さく分けて TypeScript に移す。

- 実行環境は Node.js の LTS。型を取り除く機能（Node.js 22.18 以降は既定で有効）で動かし、ビルドの手順は増やさない
- スキーマは Zod で定義する（[ADR 0006](0006-schema-definition.md)）
- `verify` を実行する処理は 1 つのパッケージにまとめ、MCP サーバーと checker の両方から使う。checker を移し終えるまでは MCP サーバーだけが使い、定期実行の checker は今の検知のまま動かす（[ADR 0007](0007-checker-entry-points.md)）
- checker は、検知などの単位に分けて 1 つずつ移す。移す前に、その部分の今の Python 版の振る舞いを確かめるテストを足し、TypeScript 版が同じ結果を返すことを確かめてから入れ替える
- 移している途中に新しく足す検知は、TypeScript で書く
- v1（12/12）までに移し終えることは求めない。v1 の checker は Python のままでよい
- gitleaks・zizmor などの外部ツールは、今と同じく版とハッシュを固定して呼ぶ（言語の選択とは関係しない）

## 根拠

- **スキーマを 1 つにできる**: Zod の定義を、guide の確認、MCP サーバーの入出力、checker のすべてで直接使える。JSON Schema を経由して別の言語の型と合わせ続ける必要がない
- **plugin で配りやすい**: Claude Code は、plugin に lockfile があれば Node.js の依存を自動で入れる。Python では、利用者の PC に `uv` などを入れてもらう必要がある。ほかのエージェントにも `npx` で版を固定して渡せる
- **checker を JavaScript の action にできる**: 利用者の Actions で Python の環境を用意する手順が要らなくなる（action の形は [#12](https://github.com/codeforjapan/code4security/issues/12) で決める）
- **コントリビューター**: シビックテックや個人開発で Web を作っている人には、TypeScript を書ける人が多い。Viewer を作り直すときも同じ言語で書ける
- **時期**: 一度に書き直すと、取り込みと v1 の準備が書き直しを待つことになる。Python のまま取り込んで小さく移せば、取り込みも v1 も止めずに進められる

## 影響

### メリット

- 言語とツールが 1 つにそろい、lint・テスト・依存の管理・CI が 1 種類で済む
- `verify` の結果が、MCP サーバーと checker で食い違わない（checker を移し終えてから）

### 懸念点

- 動いている Python のコードを移すことで、不具合が入る
  - 緩和策: 今のテストは少ないので、移す前に、同じ入力に同じ Issue の本文を返すかを確かめるテストを足す。小さく分けて移し、入れ替えるまでは Python 版を `dry-run` で並べて動かし、結果を比べる
- 移している途中は、Python と TypeScript の 2 つの言語が並び、lint・テスト・CI が 2 種類になる
  - 緩和策: Python を残すのは checker だけにし、移し終えたら外す。新しく足す検知は TypeScript で書き、Python の部分を増やさない
- npm の依存パッケージが、サプライチェーンの侵入口になる
  - 緩和策: 依存は最小限にし、lockfile を固定する。新しい版はすぐに入れず、Dependabot の cooldown を使う（[ADR 0008](0008-repo-defense.md)）
- セキュリティの分野では Python を書く人が多く、その人たちが入りにくくなる
  - 緩和策: 項目データ（YAML）とテンプレの PR には、言語の知識が要らない。コードを書く部分は、全体のごく一部にとどめる

## 代替案

- **Python にそろえる**: checker はそのまま使え、スキーマは Pydantic で定義して JSON Schema を書き出せる。一方で、plugin の MCP サーバーを動かすために利用者の PC に Python の実行環境が要る。Viewer は結局 JavaScript になり、2 つの言語が残る
- **今のまま 2 つの言語を使う**: 書き直しの費用はかからない。一方で、`verify` を実行する処理を 2 つの言語で持つか、MCP サーバーから Python を呼んで利用者の PC に Python を求めることになる。スキーマも JSON Schema を経由して合わせ続ける必要がある
- **Go などで 1 つの実行ファイルにする**: 利用者の環境に依存しない。一方で、Claude Code の plugin は実行ファイルを自動では入れず、OS ごとのビルドと配布が要る。コントリビューターも少なくなる

## 今後の方向性

- 移す作業の切り方（検知ごとに 1 つの PR にする、など）と担当は、取り込み（[#18](https://github.com/codeforjapan/code4security/issues/18)）のあとに決める
- `verify` を実行するパッケージの置き場所と、パッケージの管理（pnpm の workspace など）を決める
- action の形（ビルドした `dist` をコミットするか）は、TypeScript 版の checker を action にするときに決める（[#12](https://github.com/codeforjapan/code4security/issues/12)）
- 見直すきっかけ: 2 つの言語が並ぶ期間が長引き、保守の負担が大きくなったとき

### 意見を聞きたいこと

- 意見は [#7](https://github.com/codeforjapan/code4security/issues/7) へ（2026-10-24 まで）

## 参考

- [first-security-checkup](https://github.com/yokinist/first-security-checkup)
- [weekly-security-checker](https://github.com/yokinist/weekly-security-checker)
- [Claude Code: plugin の依存の自動インストール](https://code.claude.com/docs/en/plugins/loading.md)
- [ADR 0002: 取り込み](0002-import-yokinist-repos.md)
- [ADR 0004: このリポジトリの役割と、plugin での配り方](0004-repo-role-and-distribution.md)
- [ADR 0006: スキーマ定義](0006-schema-definition.md)
- [ADR 0007: checker の起動ルート](0007-checker-entry-points.md)
- [#7: 実装の言語を TypeScript にそろえるかを決める](https://github.com/codeforjapan/code4security/issues/7)
