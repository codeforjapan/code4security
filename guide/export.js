// data/ の YAML を読み、書き方を確かめてから、ページが読む data.js と checklist.json・checklist.md・llms.txt を書き出す: pnpm build
// PR と main では GitHub Actions（リポジトリ直下の .github/workflows/guide.yml）が実行する。誤りがあればここで止まる
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// ---- data/ を読む ----
const errors = [];
const DATA = path.join(__dirname, "data");
const load = rel => {
  try {
    return yaml.load(fs.readFileSync(path.join(DATA, rel), "utf8"), { schema: yaml.CORE_SCHEMA });  // 日付などを勝手に型変換しない
  } catch (e) {
    errors.push(`data/${rel}: 読めません（${String(e.message).split("\n")[0]}）`);
    return null;
  }
};
const ABOUT = load("about.yml") || {};
const LEVELS = load("levels.yml") || [];
const CONDITIONS = load("conditions.yml") || [];
const SOURCES = load("sources.yml") || {};
const RECOMMENDED = load("recommended.yml") || [];
const order = load("categories.yml") || [];
const ymlFiles = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".yml") && f !== "_category.yml") : []);
for (const name of fs.readdirSync(path.join(DATA, "items"))) {
  if (fs.statSync(path.join(DATA, "items", name)).isDirectory() && !order.includes(name)) errors.push(`data/items/${name}/ が categories.yml にありません`);
}
const CATEGORIES = order.map(id => {
  const c = load(`items/${id}/_category.yml`) || {};
  const listed = Array.isArray(c.items) ? c.items : [];
  for (const f of ymlFiles(path.join(DATA, "items", id))) {
    if (!listed.includes(f.replace(/\.yml$/, ""))) errors.push(`data/items/${id}/${f} が、同じフォルダの _category.yml の items にありません`);
  }
  return {
    id, title: c.title, ...(c.lead ? { lead: c.lead } : {}),
    items: listed.map(name => {
      const it = load(`items/${id}/${name}.yml`) || {};
      if (it.id !== name) errors.push(`data/items/${id}/${name}.yml: id（${it.id}）をファイル名と同じ ${name} にします`);
      return it;
    }),
  };
});

// ---- 書き方の確認 ----
const items = CATEGORIES.flatMap(c => c.items);
const levels = new Set(LEVELS.map(l => l.level));
const conditions = new Set(CONDITIONS.map(c => c.id));
const ITEM_KEYS = new Set(["id", "level", "title", "when", "risk", "why", "how", "how_for_private_repos", "related", "evidence", "mappings"]);
const dup = list => list.filter((x, i) => list.indexOf(x) !== i);
for (const id of dup(items.map(i => i.id))) errors.push(`項目の id が重複しています: ${id}`);
for (const id of dup(CONDITIONS.map(c => c.id))) errors.push(`条件の id が重複しています: ${id}`);
for (const it of items) {
  const at = `項目 ${it.id}`;
  for (const k of Object.keys(it)) if (!ITEM_KEYS.has(k)) errors.push(`${at}: ${k} という欄はありません（書ける欄: ${[...ITEM_KEYS].join(", ")}）`);
  for (const f of ["id", "title", "risk", "why"]) if (typeof it[f] !== "string" || !it[f].trim()) errors.push(`${at}: ${f} がありません`);
  if (!levels.has(it.level)) errors.push(`${at}: level の ${it.level} は levels.yml にありません`);
  if (!Array.isArray(it.when)) errors.push(`${at}: when は配列にします（すべてのプロジェクトに出すなら []）`);
  for (const t of it.when || []) if (!conditions.has(t)) errors.push(`${at}: when の ${t} は conditions.yml にありません`);
  if (!Array.isArray(it.related)) errors.push(`${at}: related は配列にします（なければ []）`);
  for (const k of it.related || []) if (!SOURCES[k]) errors.push(`${at}: related の ${k} は sources.yml にありません`);
  if (!Array.isArray(it.how) || !it.how.length) errors.push(`${at}: how がありません`);
  for (const h of it.how || []) if (!(h.text || h.command || (h.title && h.url))) errors.push(`${at}: how には text か command か、title と url を書きます`);
  if (it.evidence !== undefined && !Array.isArray(it.evidence)) errors.push(`${at}: evidence は配列にします`);
  for (const e of Array.isArray(it.evidence) ? it.evidence : []) {
    if (!SOURCES[e.source]) errors.push(`${at}: evidence の ${e.source} は sources.yml にありません`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.checked))) errors.push(`${at}: evidence の checked は 2026-10-15 のように、確かめた日を書きます`);
  }
  if (it.mappings !== undefined && (!Array.isArray(it.mappings) || it.mappings.some(m => typeof m !== "string" || !m.trim()))) errors.push(`${at}: mappings は文字列の配列にします`);
}
for (const r of RECOMMENDED) for (const p of r.picks) if (!SOURCES[p.source]) errors.push(`recommended.yml の ${p.source} は sources.yml にありません`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const used = new Set([...items.flatMap(i => [...i.related, ...(i.evidence || []).map(e => e.source)]), ...RECOMMENDED.flatMap(r => r.picks.map(p => p.source))]);
const unused = Object.keys(SOURCES).filter(k => !used.has(k));
if (unused.length) console.warn(`どこからも使われていない資料（消してよいか確かめる）: ${unused.join(", ")}`);

// ---- checklist.json ----
const data = {
  schema_version: 1,
  name: ABOUT.name,
  description: ABOUT.description,
  language: "ja",
  url: ABOUT.url,
  license: { content: "CC BY 4.0（https://creativecommons.org/licenses/by/4.0/deed.ja）", code: "MIT" },
  updated: ABOUT.updated,
  disclaimer: ABOUT.disclaimer,
  how_to_use: [
    "1. 対象のプロジェクトに当てはまる conditions の id をすべて選ぶ。当てはまるか分からないものは利用者に確かめ、確かめられなければ選んでおく",
    "2. items のうち、when が空のもの、または when に手順 1 で選んだ id を 1 つでも含むものが、そのプロジェクトの点検項目になる",
    "3. 点検項目を level の小さい順（1 まずやる → 2 次にやる → 3 余裕ができたら）に確かめる。title の状態になっていれば済み、なっていなければ how の手順で対策する",
    "4. 非公開リポジトリで GitHub の機能を使えない項目は、how_for_private_repos の代わりの手段を使う",
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
    "items[].how": "使えるツール・コマンド・手順。command の <owner> はアカウント名や organization 名、<repo> はリポジトリ名、<org> は organization 名に置き換える。<ドメイン> や <パッケージ名> など、ほかの <…> も自分の値に置き換える",
    "items[].how_for_private_repos": "個人アカウントや Free の organization の非公開リポジトリでは GitHub の機能を使えない項目だけにある、無料の代わりの手段",
    "items[].related": "より詳しく知るための公式ドキュメントや公的機関の資料。本文の根拠として一つずつ検証したものではない",
    "items[].evidence": "本文の事実を確かめた資料（title・url）と、確かめた日（checked）、確かめた内容（note）。ある項目だけに付く",
    "items[].mappings": "対応する規格の番号（OWASP・OpenSSF Baseline など）。ある項目だけに付く",
  },
  levels: LEVELS,
  conditions: CONDITIONS,
  categories: CATEGORIES.map(c => ({ id: c.id, title: c.title })),
  items: CATEGORIES.flatMap(c => c.items.map(it => ({
    id: it.id, category: c.id, level: it.level, title: it.title, risk: it.risk, why: it.why,
    when: it.when,
    how: it.how,
    ...(it.how_for_private_repos ? { how_for_private_repos: it.how_for_private_repos } : {}),
    related: it.related.map(k => ({ title: SOURCES[k].title, url: SOURCES[k].url })),
    ...(it.evidence ? { evidence: it.evidence.map(e => ({ title: SOURCES[e.source].title, url: SOURCES[e.source].url, checked: e.checked, ...(e.note ? { note: e.note } : {}) })) } : {}),
    ...(it.mappings ? { mappings: it.mappings } : {}),
  }))),
};
const write = (name, text) => fs.writeFileSync(path.join(__dirname, name), text);

// ---- data.js（ページが読み込む。コミットしない） ----
write("data.js", "// export.js が data/ の YAML から作る。直すときは data/ を直す\n"
  + Object.entries({ ABOUT, LEVELS, CONDITIONS, CATEGORIES, SOURCES, RECOMMENDED }).map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`).join("\n") + "\n");
write("checklist.json", JSON.stringify(data, null, 2) + "\n");

// ---- checklist.md（GitHub でそのまま読める。AI にも渡しやすい） ----
const cond = Object.fromEntries(data.conditions.map(c => [c.id, c.label]));
const md = [
  `# ${data.name}`,
  "",
  data.description,
  "",
  `> ${data.disclaimer}`,
  "",
  "## 使い方",
  "",
  ...data.how_to_use,
  "",
  "## 優先度",
  "",
  ...data.levels.map(l => `- **${l.label}**: ${l.description}`),
  "",
  "## 条件",
  "",
  ...data.conditions.map(c => `- \`${c.id}\`: ${c.label}（${c.group}）`),
  "",
  "## 点検項目",
];
for (const cat of data.categories) {
  md.push("", `### ${cat.title}`);
  for (const it of data.items.filter(i => i.category === cat.id)) {
    md.push("", `#### [${data.levels.find(l => l.level === it.level).label}] ${it.title}`, "");
    md.push(`- 関係するプロジェクト: ${it.when.length ? it.when.map(t => cond[t]).join("、") + " のどれか" : "すべて"}`);
    md.push(`- リスク: ${it.risk}`, `- なぜ必要か: ${it.why}`, "- 使えるもの:");
    for (const h of it.how) {
      if (h.command) md.push("", "  ```", ...h.command.split("\n").map(l => "  " + l), "  ```", "");
      else if (h.url) md.push(`  - [${h.title}](${h.url})`);
      else md.push(`  - ${h.text}`);
    }
    if (it.how_for_private_repos) {
      md.push(`- 非公開リポジトリなら: ${it.how_for_private_repos.text}`);
      if (it.how_for_private_repos.command) md.push("", "  ```", ...it.how_for_private_repos.command.split("\n").map(l => "  " + l), "  ```", "");
    }
    if (it.related.length) md.push(`- 関連資料: ${it.related.map(r => `[${r.title}](${r.url})`).join("、")}`);
    if (it.evidence) md.push(`- 根拠: ${it.evidence.map(e => `[${e.title}](${e.url})（${e.checked} に確認${e.note ? `：${e.note}` : ""}）`).join("、")}`);
    if (it.mappings) md.push(`- 対応する規格: ${it.mappings.join("、")}`);
  }
}
write("checklist.md", md.join("\n").replace(/\n{3,}/g, "\n\n") + "\n");

// ---- llms.txt（https://llmstxt.org/ の形）。サイトの直下に置く ----
write("llms.txt", [
  `# ${data.name}`,
  "",
  `> ${data.description}`,
  "",
  `${data.conditions.length} の条件から、${data.items.length} の点検項目を「まずやる」「次にやる」「余裕ができたら」の 3 段階の優先度つきで示す。${data.disclaimer}`,
  "",
  "## 点検表",
  "",
  `- [点検表（Markdown）](${data.url}checklist.md): すべての項目のリスク・必要な理由・使えるツール・関連資料`,
  `- [点検表（JSON）](${data.url}checklist.json): 条件と項目の対応。使い方と各フィールドの意味も含む`,
  `- [点検表のページ](${data.url}): 条件を選んで点検し、AI への相談文も作れる`,
  "- [weekly-security-checker](https://github.com/codeforjapan/code4security/tree/main/checker): アカウントや organization のリポジトリを毎週まとめて調べ、指摘を非公開リポジトリの Issue にまとめる GitHub Action（試験運用中）",
  "",
].join("\n"));

console.log(`data.js・checklist.json・checklist.md・llms.txt: ${data.items.length} 項目`);
