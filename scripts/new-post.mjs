import fs from "node:fs";
import path from "node:path";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('Usage: npm run new -- "文章标题"');
  process.exit(1);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const fileName = `${date}-${slugify(title) || "untitled"}.md`;
const dir = path.join(process.cwd(), "content", "posts");
fs.mkdirSync(dir, { recursive: true });

const target = path.join(dir, fileName);
if (fs.existsSync(target)) {
  console.error(`${target} already exists.`);
  process.exit(1);
}

const body = `---
title: ${title}
date: ${date}
category: 工作
summary:
keywords:
---

在这里写正文。
`;

fs.writeFileSync(target, body, "utf8");
console.log(target);
