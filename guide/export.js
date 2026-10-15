// data.js の書き方を確かめてから、checklist.json・checklist.md・llms.txt を書き出す: node export.js
// 公開のときは GitHub Actions（.github/workflows/pages.yml）が実行する。誤りがあればここで止まり、公開されない
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + "\nthis.d = { ABOUT, LEVELS, CONDITIONS, CATEGORIES, SOURCES, RECOMMENDED };", ctx);
const { ABOUT, LEVELS, CONDITIONS, CATEGORIES, SOURCES, RECOMMENDED } = ctx.d;

// ---- 書き方の確認 ----
const errors = [];
const items = CATEGORIES.flatMap(c => c.items);
const levels = new Set(LEVELS.map(l => l.level));
const conditions = new Set(CONDITIONS.map(c => c.id));
const ITEM_KEYS = new Set(["id", "level", "title", "when", "risk", "why", "how", "how_for_private_repos", "related"]);
const dup = list => list.filter((x, i) => list.indexOf(x) !== i);
for (const id of dup(items.map(i => i.id))) errors.push(`項目の id が重複しています: ${id}`);
for (const id of dup(CONDITIONS.map(c => c.id))) errors.push(`条件の id が重複しています: ${id}`);
for (const id of dup(CATEGORIES.map(c => c.id))) errors.push(`カテゴリの id が重複しています: ${id}`);
for (const it of items) {
  const at = `項目 ${it.id}`;
  for (const k of Object.keys(it)) if (!ITEM_KEYS.has(k)) errors.push(`${at}: ${k} という欄はありません（書ける欄: ${[...ITEM_KEYS].join(", ")}）`);
  for (const f of ["id", "title", "risk", "why"]) if (typeof it[f] !== "string" || !it[f].trim()) errors.push(`${at}: ${f} がありません`);
  if (!levels.has(it.level)) errors.push(`${at}: level の ${it.level} は LEVELS にありません`);
  if (!Array.isArray(it.when)) errors.push(`${at}: when は配列にします（すべてのプロジェクトに出すなら []）`);
  for (const t of it.when || []) if (!conditions.has(t)) errors.push(`${at}: when の ${t} は CONDITIONS にありません`);
  if (!Array.isArray(it.related)) errors.push(`${at}: related は配列にします（なければ []）`);
  for (const k of it.related || []) if (!SOURCES[k]) errors.push(`${at}: related の ${k} は SOURCES にありません`);
  if (!Array.isArray(it.how) || !it.how.length) errors.push(`${at}: how がありません`);
  for (const h of it.how || []) if (!(h.text || h.command || (h.title && h.url))) errors.push(`${at}: how には { text } か { command } か { title, url } を書きます`);
}
for (const r of RECOMMENDED) for (const p of r.picks) if (!SOURCES[p.source]) errors.push(`RECOMMENDED の ${p.source} は SOURCES にありません`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const used = new Set([...items.flatMap(i => i.related), ...RECOMMENDED.flatMap(r => r.picks.map(p => p.source))]);
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
  }))),
};
const write = (name, text) => fs.writeFileSync(path.join(__dirname, name), text);
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
  "- [weekly-security-checker](https://github.com/yokinist/weekly-security-checker): アカウントや organization のリポジトリを毎週まとめて調べ、指摘を非公開リポジトリの Issue にまとめる GitHub Action（試験運用中）",
  "",
].join("\n"));

console.log(`checklist.json・checklist.md・llms.txt: ${data.items.length} 項目`);
