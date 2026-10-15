"""python3 test_scan.py で実行する。"""
import scan
from scan import plan


def issue(n, fp, state="open", reason=None):
    return {"number": n, "state": state, "state_reason": reason, "title": "t",
            "body": f"<!-- security-ops:fp={fp} -->", "labels": []}


def finding(fp):
    return {"fp": fp, "title": "t", "body": f"<!-- security-ops:fp={fp} -->", "labels": []}


def test_plan():
    issues = [
        issue(1, "o/a|x|same"),                         # 変化なし → 何もしない
        issue(2, "o/a|x|fixed-then-back", "closed", "completed"),  # 再発 → 開き直す
        issue(3, "o/a|x|accepted", "closed", "not_planned"),       # 対応しないと決めた → 開き直さない
        issue(4, "o/a|x|gone"),                         # 直った → 閉じる
        issue(5, "o/b|x|other-repo"),                   # 今回スキャンしていないリポジトリ → 触らない
        issue(6, "o/a|y|tool-missing"),                 # 今回調べられなかった種類 → 触らない
    ]
    findings = [finding(fp) for fp in ("o/a|x|same", "o/a|x|fixed-then-back", "o/a|x|accepted", "o/a|x|new")]
    got = [(a, (f or {}).get("fp"), (i or {}).get("number")) for a, f, i in plan(findings, issues, {"o/a|x"})]
    assert got == [
        ("reopen", "o/a|x|fixed-then-back", 2),
        ("create", "o/a|x|new", None),
        ("close", None, 4),
    ], got


def test_alerts_hide_secret():
    urls = []
    real = scan.api_list
    scan.api_list = lambda url, token=None: urls.append(url) or []
    try:
        for kind in scan.KINDS:
            scan.alerts("o/r", kind)
    finally:
        scan.api_list = real
    secret = [u for u in urls if "/secret-scanning/" in u]
    assert secret and all("hide_secret=true" in u for u in secret), urls
    assert not any("hide_secret" in u for u in urls if "/secret-scanning/" not in u), urls


if __name__ == "__main__":
    test_plan()
    test_alerts_hide_secret()
    print("ok")
