// data.js から checklist.json・checklist.md・llms.txt を作り直す: node export.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + "\nthis.data = checklistJson();", ctx);
const data = ctx.data;
const write = (name, text) => fs.writeFileSync(path.join(__dirname, name), text);

write("checklist.json", JSON.stringify(data, null, 2) + "\n");

// Markdown 版（GitHub でそのまま読める。AI にも渡しやすい）
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

// llms.txt（https://llmstxt.org/ の形）。サイトの直下に置く
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
