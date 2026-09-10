import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_OBSIDIAN_POSTS = [
  "/Users/taotao/Documents/Obsidian Vault-2026年7月15日/02-写作研究/01-发布文章",
  "D:\\Obsidian Vault-2026年7月15日\\02-写作研究\\01-发布文章",
  "D:\\Nutstore\\Obsidian Vault\\posts",
];

export function repoRootFrom(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..");
}

export function findObsidianPosts(explicitPath = "") {
  const candidates = [explicitPath, process.env.OBSIDIAN_POSTS_DIR, ...DEFAULT_OBSIDIAN_POSTS].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());
  return found || candidates[0] || path.join(os.homedir(), "Documents", "Obsidian", "发布文章");
}

export function isPublishableMarkdown(name, source = "") {
  if (!name.toLowerCase().endsWith(".md")) return false;
  if (/^(未命名|untitled)/i.test(name)) return false;

  const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatter) return true;
  return !/^draft\s*:\s*(true|yes|1)\s*$/im.test(frontMatter[1]);
}

export function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}
