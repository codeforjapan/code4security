#!/usr/bin/env python3
"""リポジトリを横断してセキュリティの指摘を集め、DEST_REPO の Issue に集約する。

  python3 scan.py <owner | owner/repo> [--max 8] [--dry-run]

読み取りは SCAN_TOKEN（無ければ gh のログイン）、起票は GH_TOKEN（Actions では GITHUB_TOKEN）を使う。
gitleaks と zizmor が PATH にあれば、リポジトリを一時的に clone して履歴とワークフローも調べる（コードは実行しない）。
同じ指摘は fingerprint で突き合わせ、重複起票しない。直ったら自動で閉じ、再発したら開き直す。
「対応しない（not planned）」で閉じた Issue は再発しても開き直さない。
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

DEST = os.environ.get("DEST_REPO") or os.environ.get("GITHUB_REPOSITORY")
SCAN_TOKEN = os.environ.get("SCAN_TOKEN")
# Issue を見分ける目印。変えると既存の Issue と突き合わせられなくなるので変えない
MARK = "security-ops"
FP_RE = re.compile(r"<!-- security-ops:fp=(.+?) -->")
SEVERITIES = ["low", "medium", "high", "critical"]
MANAGED_PREFIXES = ("repo:", "severity:", "kind:", MARK)
KINDS = ("dependabot", "secret-scanning", "code-scanning")
# 機能がオフのときに API が返すメッセージ（権限不足とは区別する）
OFF_HINTS = ("disabled", "not enabled", "no analysis found", "must be enabled")
LABEL_COLORS = {
    "severity:critical": "b60205", "severity:high": "d93f0b",
    "severity:medium": "fbca04", "severity:low": "c2e0c6", MARK: "000000",
}


class GhError(Exception):
    pass


def gh(*args, token=None, data=None):
    env = dict(os.environ)
    if token:
        env["GH_TOKEN"] = token
    # 読み取りだけ、一時的なエラー（502・503・504）のときにやり直す。書き込みは二重に作らないようやり直さない
    retryable = data is None and "-X" not in args
    if data is not None:
        args = (*args, "--input", "-")
    for attempt in range(3):
        p = subprocess.run(["gh", *args], capture_output=True, text=True, env=env,
                           input=None if data is None else json.dumps(data))
        if not p.returncode:
            return p.stdout
        err = p.stderr.strip() or p.stdout.strip()
        if not (retryable and re.search(r"HTTP 50[234]", err)) or attempt == 2:
            raise GhError(err)
        time.sleep(5 * (attempt + 1))


def api_list(path, token=None):
    pages = json.loads(gh("api", "--paginate", "--slurp", path, token=token))
    return [x for page in pages for x in page]


def alerts(repo, kind):
    """open なアラート一覧。機能がオフなら None。"""
    # secret scanning は既定で秘密の値そのものを返す。使わないので、ランナーに届かないようにする
    hide = "&hide_secret=true" if kind == "secret-scanning" else ""
    try:
        return api_list(f"repos/{repo}/{kind}/alerts?state=open&per_page=100{hide}", SCAN_TOKEN)
    except GhError as e:
        if any(h in str(e) for h in OFF_HINTS):
            return None
        raise


def run(*args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def mentions(root, paths, pattern):
    """paths（ファイルかディレクトリ）のどれかに pattern が書かれているか。"""
    files = []
    for rel in paths:
        path = os.path.join(root, rel)
        if os.path.isdir(path):
            files += [os.path.join(path, f) for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        elif os.path.isfile(path):
            files.append(path)
    for f in files:
        with open(f, encoding="utf-8", errors="ignore") as fh:
            if re.search(pattern, fh.read(), re.I):
                return True
    return False


def local_scans(repo, errors):
    """clone して gitleaks（履歴のシークレット）と zizmor（ワークフロー）を実行する。
    ツールが無い・失敗したものは None にして、その種類の Issue を閉じないようにする。"""
    out = {"history": None, "workflow": None, "head": None, "precommit_secrets": None, "sast": None}
    tools = {t: shutil.which(t) for t in ("gitleaks", "zizmor")}
    name = repo["nameWithOwner"]
    token = SCAN_TOKEN or gh("auth", "token").strip()
    env = {**os.environ, "GH_TOKEN": token, "GIT_LFS_SKIP_SMUDGE": "1", "GIT_TERMINAL_PROMPT": "0"}
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "src")
        p = run("gh", "repo", "clone", name, src, "--", "--quiet", env=env)
        if p.returncode:
            errors.append(f"{name}: clone に失敗しました {p.stderr.strip()[:200]}")
            return out
        out["head"] = run("git", "-C", src, "rev-parse", "HEAD").stdout.strip()
        # 非公開リポジトリで有料の機能の代わりになる仕組みが入っているか（ファイルを読むだけ）
        out["precommit_secrets"] = mentions(src, [".pre-commit-config.yaml", "lefthook.yml", ".lefthook.yml", ".husky"],
                                            r"gitleaks|secretlint|trufflehog|detect-secrets")
        out["sast"] = mentions(src, [".github/workflows"], r"semgrep|codeql")
        if tools["gitleaks"]:
            report = os.path.join(tmp, "gitleaks.json")
            p = run(tools["gitleaks"], "git", src, "--no-banner", "--redact", "--exit-code", "0",
                    "--report-format", "json", "--report-path", report)
            if p.returncode:
                errors.append(f"{name}: gitleaks が失敗しました {p.stderr.strip()[:200]}")
            else:
                with open(report) as fh:
                    out["history"] = json.load(fh) or []
        if tools["zizmor"]:
            if not (os.path.isdir(os.path.join(src, ".github", "workflows")) or os.path.exists(os.path.join(src, "action.yml"))):
                out["workflow"] = []  # 調べるワークフローがない
            else:
                p = run(tools["zizmor"], "--format", "json", "--no-progress", "--no-exit-codes",
                        "--min-severity", "medium", ".", cwd=src, env=env)
                if p.returncode:
                    errors.append(f"{name}: zizmor が失敗しました {p.stderr.strip()[-200:]}")
                else:
                    out["workflow"] = [f for f in json.loads(p.stdout or "[]") if not f.get("ignored")]
    return out


# 全件を取ると重くてタイムアウトするので、最近 push された順に必要な分だけ取る
REPOS_QUERY = """query($owner: String!, $n: Int!) {
  repositoryOwner(login: $owner) {
    repositories(first: $n, isFork: false, isArchived: false, ownerAffiliations: OWNER,
                 orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes { nameWithOwner visibility pushedAt url isEmpty }
    }
  }
}"""


def list_repos(target, limit):
    if "/" in target:
        return [json.loads(gh("repo", "view", target, "--json", "nameWithOwner,visibility,pushedAt,url,isEmpty",
                              token=SCAN_TOKEN))]
    # 空のリポジトリと起票先を除く分だけ、少し多めに取る
    data = json.loads(gh("api", "graphql", "-f", f"query={REPOS_QUERY}", "-F", f"owner={target}",
                         "-F", f"n={min(100, limit + 10)}", token=SCAN_TOKEN))
    owner = data["data"]["repositoryOwner"]
    if not owner:
        sys.exit(f"{target} が見つかりません")
    repos = [r for r in owner["repositories"]["nodes"] if not r["isEmpty"] and r["nameWithOwner"] != DEST]
    return repos[:limit]


def max_sev(sevs):
    return max(sevs, key=lambda s: SEVERITIES.index(s) if s in SEVERITIES else 1)


def cell(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def finding(repo, kind, key, severity, title, what, where, fix, verify):
    name, short = repo["nameWithOwner"], repo["nameWithOwner"].split("/")[1]
    fp = f"{name}|{kind}|{key}"
    body = f"""<!-- security-ops:fp={fp} -->
**リポジトリ**: [{name}]({repo['url']})（{repo['visibility'].lower()}）
**深刻度**: {severity}

### 何が
{what}

### どこ
{where}

### 直し方
{fix}

### 確かめ方
{verify}

---
<sub>[weekly-security-checker](https://github.com/yokinist/weekly-security-checker) が自動で起票・更新しています。直ると次回の実行で自動で閉じます。対応しないと決めたら「Close as not planned」で閉じてください（再発しても開き直しません）。</sub>
"""
    return {"fp": fp, "repo": name, "title": f"[{short}] {title}", "body": body,
            "labels": [MARK, f"repo:{short}", f"severity:{severity}", f"kind:{kind}"]}


def dependabot_findings(repo, items, limit=100):
    # パッケージごとに Issue を立てると古いリポジトリで数十件になるので、リポジトリごとに 1 件にまとめる
    if not items:
        return []
    groups = {}
    for a in items:
        pkg = a["dependency"]["package"]
        groups.setdefault((pkg["ecosystem"], pkg["name"]), []).append(a)
    rank = lambda g: SEVERITIES.index(max_sev(a["security_vulnerability"]["severity"] for a in g))
    ordered = sorted(groups.items(), key=lambda kv: (-rank(kv[1]), kv[0]))
    rows = []
    for (eco, pkg), group in ordered[:limit]:
        patched = {(a["security_vulnerability"].get("first_patched_version") or {}).get("identifier") for a in group}
        best = max((v for v in patched if v), default=None,
                   key=lambda v: tuple(int(x) for x in re.findall(r"\d+", v)))
        target = f"`{best}` 以上" + ("（一部は修正版なし）" if None in patched else "") if best else "修正版なし"
        rel = "/".join(sorted({a["dependency"].get("relationship") or "?" for a in group}))
        rows.append(f"| [{eco}: {pkg}]({repo['url']}/security/dependabot?q=package%3A{pkg}) "
                    f"| {SEVERITIES[rank(group)]} | {len(group)} | {rel} | {target} |")
    if len(ordered) > limit:
        rows.append(f"| ほか {len(ordered) - limit} パッケージ | | | | |")
    counts = {s: sum(a["security_vulnerability"]["severity"] == s for a in items) for s in reversed(SEVERITIES)}
    manifests = ", ".join(sorted({f"`{a['dependency']['manifest_path']}`" for a in items}))
    return [finding(
        repo, "dependency", "all", max_sev(a["security_vulnerability"]["severity"] for a in items),
        f"依存パッケージに既知の脆弱性 {len(groups)} パッケージ / {len(items)} 件",
        "内訳: " + ", ".join(f"{s} {n}" for s, n in counts.items() if n) + "\n\n"
        "| パッケージ | 最大の深刻度 | 件数 | 依存の種類 | 全件直るバージョン |\n|---|---|---|---|---|\n" + "\n".join(rows),
        manifests,
        "1. 深刻度の高い **direct**（直接の依存）から、表の「全件直るバージョン」まで上げる\n"
        "2. **transitive**（間接の依存）は親パッケージを更新するか、overrides / resolutions で固定する\n"
        "3. まとめて上げるなら `npm audit fix` などで lockfile を作り直す。"
        "Dependabot security updates を有効にすると修正 PR が自動で届く\n"
        "4. もう使っていないリポジトリなら、**アーカイブするのがいちばん安全な修正**です",
        "lockfile を更新して push すると Dependabot のアラートが閉じ、この Issue の表も次回の実行で更新されます。"
        "すべて直ると自動で閉じます。")]


def secret_findings(repo, items):
    for a in items:
        active = a.get("validity") == "active"
        yield finding(
            repo, "secret", str(a["number"]), "critical" if active else "high",
            f"{a['secret_type_display_name']} が漏れています（alert #{a['number']}）",
            f"- 種類: {a['secret_type_display_name']}\n- 有効性: {a.get('validity', 'unknown')}\n"
            f"- 公開の場所でも見つかっている: {'はい' if a.get('publicly_leaked') else 'いいえ/不明'}",
            f"[アラートのページ]({a['html_url']}) で確認してください（値はこの Issue には書きません）。",
            "1. 発行元でキーを失効させ、新しいキーを発行する（**これが最優先**。履歴から消すだけでは不十分）\n"
            "2. 新しいキーは環境変数やデプロイ先の Secrets に置き、コードには書かない\n"
            "3. アラートを「Revoked」で閉じる",
            "古いキーで API を呼んで拒否されることを確かめてください。")


def code_findings(repo, items):
    groups = {}
    for a in items:
        groups.setdefault(a["rule"]["id"], []).append(a)
    level = {"error": "high", "warning": "medium", "note": "low"}
    for rule_id, group in sorted(groups.items()):
        rule = group[0]["rule"]
        sev = max_sev(a["rule"].get("security_severity_level") or level.get(a["rule"].get("severity"), "medium")
                      for a in group)
        where = "\n".join(
            f"- [{a['most_recent_instance']['location']['path']}:{a['most_recent_instance']['location'].get('start_line', '')}]"
            f"({a['html_url']})" for a in group)
        yield finding(
            repo, "code", rule_id, sev, f"{rule.get('description') or rule_id}（{len(group)} 箇所）",
            f"- ルール: `{rule_id}`（{group[0]['tool']['name']}）\n- {rule.get('description', '')}",
            where,
            "各アラートのページに説明と修正例があります。Copilot Autofix が使えるならアラートのページから修正 PR を作れます。",
            "修正を push して解析が通るとアラートが閉じ、次回の実行でこの Issue も閉じます。")


def history_findings(repo, items, limit=50):
    # 値は書かない。誤検知の除外は対象リポジトリの .gitleaksignore で行う
    if not items:
        return []
    rows = [f"| {cell(f['RuleID'])} | [{cell(f['File'])}:{f['StartLine']}]({f['Link']}) | `{f['Commit'][:7]}` | {f['Date'][:10]} |"
            for f in items[:limit]]
    if len(items) > limit:
        rows.append(f"| ほか {len(items) - limit} 件 | | | |")
    fps = "\n".join(f["Fingerprint"] for f in items[:limit])
    return [finding(
        repo, "history", "all", "high", f"コミット履歴にシークレットらしき文字列が {len(items)} 件",
        "gitleaks が、コミット履歴の中から API キーやトークンに見える文字列を見つけました。値はこの Issue には書きません。\n\n"
        "| ルール | 場所 | コミット | 日付 |\n|---|---|---|---|\n" + "\n".join(rows),
        "コミット履歴（今のファイルから消していても、履歴には残っています）",
        "1. 本物のキーなら、発行元で失効させて再発行する（**これが最優先**。履歴から消すだけでは不十分）\n"
        "2. 公開してよい値や誤検知なら、対象のリポジトリの直下にある `.gitleaksignore` に、下の fingerprint を 1 行ずつ書いてコミットする\n"
        "3. 判断がつかないものは、本物として扱う\n\n"
        "この Issue を not planned で閉じると、このリポジトリで新しく見つかったものでも開き直さなくなります。誤検知は `.gitleaksignore` で外してください。\n\n"
        f"<details><summary>fingerprint（.gitleaksignore 用）</summary>\n\n```\n{fps}\n```\n</details>",
        "失効させたら、古いキーで API が拒否されることを確かめます。`.gitleaksignore` に書いたものは、次回の実行でこの一覧から消えます。")]


def workflow_findings(repo, items, head):
    if not items:
        return []
    level = {"High": "high", "Medium": "medium"}

    def sev(group):
        return max_sev(level.get(f["determinations"]["severity"], "low") for f in group)

    def place(f):
        loc = f["locations"][0]
        path = (loc["symbolic"]["key"].get("Local") or {}).get("verbatim_path", "?")
        path = path[2:] if path.startswith("./") else path
        line = loc["concrete"]["location"]["start_point"]["row"] + 1  # zizmor の行は 0 始まり
        return path, f"[{path}:{line}]({repo['url']}/blob/{head}/{path}#L{line})"

    groups = {}
    for f in items:
        groups.setdefault(f["ident"], []).append(f)
    ordered = sorted(groups.items(), key=lambda kv: (-SEVERITIES.index(sev(kv[1])), kv[0]))
    rows = []
    for ident, group in ordered:
        where = "<br>".join(place(f)[1] for f in group[:3]) + (f"<br>ほか {len(group) - 3} 箇所" if len(group) > 3 else "")
        rows.append(f"| [{ident}]({group[0]['url']}) | {sev(group)} | {len(group)} | {cell(group[0]['desc'])} | {where} |")
    files = sorted({place(f)[0] for f in items})
    return [finding(
        repo, "workflow", "all", sev(items), f"GitHub Actions のワークフローに {len(items)} 件の指摘",
        "zizmor が、ワークフローの危ない書き方を見つけました（深刻度 medium 以上だけを載せています）。\n\n"
        "| ルール | 深刻度 | 件数 | 内容 | 場所 |\n|---|---|---|---|---|\n" + "\n".join(rows),
        ", ".join(f"`{p}`" for p in files),
        "表のルール名から、zizmor の説明と直し方を開けます。よくあるもの:\n"
        "- `unpinned-uses`: 外部の action をタグではなくコミットの SHA で固定する（`pinact run` でまとめて直せます）\n"
        "- `excessive-permissions`: ワークフローの先頭に `permissions: contents: read` を書き、書き込みが必要なジョブだけに許可を付ける\n"
        "- `artipacked`: `actions/checkout` に `persist-credentials: false` を付ける\n\n"
        "手元で `zizmor .` を実行すると、同じ結果と直し方を確かめられます。",
        "直して push すると、次回の実行でこの Issue の表が更新されます。すべて直ると自動で閉じます。")]


def config_finding(repo, got, local):
    name, public = repo["nameWithOwner"], repo["visibility"] == "PUBLIC"
    items = []  # (やること, 説明, 深刻度, 書き方, 言語)
    if got["dependabot"] is None:
        items.append(("Dependabot を有効にする", "Dependabot alerts と security updates が無効（依存の脆弱性が見えていない）", "medium",
                      f"gh api -X PUT repos/{name}/vulnerability-alerts\n"
                      f"gh api -X PUT repos/{name}/automated-security-fixes", "bash"))
    if public and got["secret-scanning"] is None:
        items.append(("Secret scanning と push protection を有効にする", "Secret scanning と push protection が無効（公開リポジトリなのにキー漏れを検知できない）", "high",
                      f"gh api -X PATCH repos/{name} \\\n"
                      "  -f 'security_and_analysis[secret_scanning][status]=enabled' \\\n"
                      "  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'", "bash"))
    if public and got["code-scanning"] is None:
        items.append(("CodeQL の default setup を有効にする", "Code scanning（CodeQL）が未設定", "low",
                      f"gh api -X PATCH repos/{name}/code-scanning/default-setup -f state=configured", "bash"))
    # 非公開リポジトリでは push protection と CodeQL が有料なので、無料の代わりの手段を示す
    if not public and local["precommit_secrets"] is False:
        items.append(("gitleaks の pre-commit フックを入れる", "コミットの前にシークレットを止める仕組みがない（非公開リポジトリでは push protection が有料のため、"
                      "gitleaks の pre-commit フックで代わりにする）", "low",
                      "# リポジトリの直下の .pre-commit-config.yaml に書き、各自の手元で pre-commit install を一度実行する\n"
                      "repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: v8.30.1\n    hooks:\n      - id: gitleaks", "yaml"))
    if not public and local["sast"] is False:
        items.append(("Semgrep を CI で動かす", "コードの静的解析が CI で動いていない（非公開リポジトリでは CodeQL が有料のため、"
                      "Semgrep の無料版で代わりにする）", "low",
                      "# まず手元で試し、問題なければ CI のワークフローに同じコマンドを足す\nsemgrep scan --config auto", "bash"))
    if not items:
        return []
    where = f"[リポジトリの設定画面]({repo['url']}/settings/security_analysis)"
    if not public and any(lang == "yaml" or "semgrep" in snippet for _, _, _, snippet, lang in items):
        where += "、リポジトリのファイル（.pre-commit-config.yaml や CI のワークフロー）"
    return [finding(
        repo, "config", "features", max_sev(sev for _, _, sev, _, _ in items),
        f"セキュリティの設定に抜けがあります（{len(items)} 件）",
        "\n".join(f"- [ ] {d}" for _, d, _, _, _ in items),
        where,
        "次のとおり設定します（ここに挙げたものはいずれも無料です）。\n\n"
        + "\n\n".join(f"**{todo}**\n\n```{lang}\n{snippet}\n```" for todo, _, _, snippet, lang in items),
        "設定すると、次回の実行でこの一覧から消えます。すべてそろうと、この Issue は自動で閉じます。")]


def collect(repo, got, local):
    out = config_finding(repo, got, local)
    out += dependabot_findings(repo, got["dependabot"] or [])
    out += secret_findings(repo, got["secret-scanning"] or [])
    out += code_findings(repo, got["code-scanning"] or [])
    out += history_findings(repo, local["history"] or [])
    out += workflow_findings(repo, local["workflow"] or [], local["head"])
    return out


def scanned_kinds(repo, got, local):
    """今回きちんと調べられた種類。ここに無い種類の Issue は、検出されなくても閉じない。"""
    name = repo["nameWithOwner"]
    # 非公開リポジトリの設定は clone して確かめるので、clone できなかったときは閉じない
    config_ok = repo["visibility"] == "PUBLIC" or local["head"] is not None
    ran = {"config": config_ok, "dependency": got["dependabot"] is not None, "secret": got["secret-scanning"] is not None,
           "code": got["code-scanning"] is not None, "history": local["history"] is not None,
           "workflow": local["workflow"] is not None}
    return {f"{name}|{kind}" for kind, ok in ran.items() if ok}


def merged_labels(issue, finding_labels):
    # 人が付けたラベルは残し、管理用のラベルだけ入れ替える
    keep = [l["name"] for l in issue["labels"] if not l["name"].startswith(MANAGED_PREFIXES)]
    return sorted(set(keep) | set(finding_labels))


def plan(findings, issues, scanned):
    """findings と既存 Issue を突き合わせて (操作, finding, issue) の一覧を返す。"""
    by_fp = {}
    for i in issues:
        m = FP_RE.search(i.get("body") or "")
        if m:
            by_fp[m.group(1)] = i
    actions, seen = [], set()
    for f in findings:
        seen.add(f["fp"])
        i = by_fp.get(f["fp"])
        if i is None:
            actions.append(("create", f, None))
        elif i["state"] == "open":
            if (i["title"], i["body"], sorted(l["name"] for l in i["labels"])) != \
                    (f["title"], f["body"], merged_labels(i, f["labels"])):
                actions.append(("update", f, i))
        elif i.get("state_reason") != "not_planned":
            actions.append(("reopen", f, i))
    for fp, i in by_fp.items():
        # 今回きちんと調べられた「リポジトリ|種類」の分だけ閉じる（対象外・失敗・ツール無しの Issue には触らない）
        if fp not in seen and i["state"] == "open" and "|".join(fp.split("|")[:2]) in scanned:
            actions.append(("close", None, i))
    return actions


def apply(actions):
    labels = {l for a, f, _ in actions if f for l in f["labels"]}
    for l in sorted(labels):
        gh("label", "create", l, "--force", "-R", DEST, "--color", LABEL_COLORS.get(l, "ededed"))
    for action, f, i in actions:
        if action == "create":
            gh("api", "-X", "POST", f"repos/{DEST}/issues",
               data={"title": f["title"], "body": f["body"], "labels": f["labels"]})
            continue
        url = f"repos/{DEST}/issues/{i['number']}"
        if action == "close":
            gh("api", "-X", "POST", f"{url}/comments", data={"body": "今回の実行で検出されなかったため、自動で閉じます。"})
            gh("api", "-X", "PATCH", url, data={"state": "closed", "state_reason": "completed"})
            continue
        data = {"title": f["title"], "body": f["body"], "labels": merged_labels(i, f["labels"])}
        if action == "reopen":
            data["state"] = "open"
            gh("api", "-X", "POST", f"{url}/comments", data={"body": "再び検出されたため、開き直します。"})
        gh("api", "-X", "PATCH", url, data=data)


def coverage(repo, got, local):
    def c(kind):
        v = got[kind]
        if v is not None:
            return f"{len(v)} 件"
        if kind == "dependabot" or repo["visibility"] == "PUBLIC":
            return "無効"
        alt = local["precommit_secrets" if kind == "secret-scanning" else "sast"]
        return "有料（代わりの仕組み: 未確認）" if alt is None else f"有料（代わりの仕組み: {'あり' if alt else 'なし'}）"
    tools = [("未実行" if local[k] is None else f"{len(local[k])} 件") for k in ("history", "workflow")]
    return f"| {repo['nameWithOwner']} | {repo['visibility'].lower()} | " + " | ".join([c(k) for k in KINDS] + tools) + " |"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("target", help="owner（最近 push された順に --max 件）または owner/repo")
    ap.add_argument("--max", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true", help="起票せず、計画と本文だけ表示する")
    args = ap.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9-]+(/[A-Za-z0-9._-]+)?", args.target):
        sys.exit(f"target の形式が不正です: {args.target}")
    if not DEST:
        sys.exit("起票先の DEST_REPO（owner/repo）を指定してください")
    if os.environ.get("GITHUB_ACTIONS") and not SCAN_TOKEN:
        sys.exit("scan-token が未設定です（README を参照）")
    if not json.loads(gh("api", f"repos/{DEST}"))["private"]:
        sys.exit(f"{DEST} が public です。脆弱性を公開してしまうので中止します")

    findings, scanned, errors = [], set(), []
    rows = ["| リポジトリ | 公開 | Dependabot | Secret scanning | Code scanning | 履歴（gitleaks） | ワークフロー（zizmor） |",
            "|---|---|---|---|---|---|---|"]
    for repo in list_repos(args.target, args.max):
        try:
            got = {k: alerts(repo["nameWithOwner"], k) for k in KINDS}
        except GhError as e:
            errors.append(f"{repo['nameWithOwner']}: {e}")
            continue
        local = local_scans(repo, errors)
        scanned |= scanned_kinds(repo, got, local)
        findings += collect(repo, got, local)
        rows.append(coverage(repo, got, local))

    issues = [i for i in api_list(f"repos/{DEST}/issues?state=all&labels={MARK}&per_page=100")
              if "pull_request" not in i]
    actions = plan(findings, issues, scanned)

    lines = rows + ["", f"指摘 {len(findings)} 件 / 操作 {len(actions)} 件" + ("（dry-run）" if args.dry_run else "")]
    lines += [f"- {a}: {(f or i)['title']}" for a, f, i in actions]
    lines += [f"- ⚠️ 取得失敗 {e}" for e in errors]
    report = "\n".join(lines)
    print(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
            fh.write(report + "\n")

    if args.dry_run:
        for a, f, _ in actions:
            if f:
                print(f"\n===== {a}: {f['title']}  {f['labels']}\n{f['body']}")
    else:
        apply(actions)
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
