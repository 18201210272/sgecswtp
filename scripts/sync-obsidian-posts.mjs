import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  findObsidianPosts,
  isPublishableMarkdown,
  parseArgs,
  repoRootFrom,
} from "./obsidian-paths.mjs";

const args = parseArgs(process.argv.slice(2));
const direction = args.direction || "obsidian-to-site";
const repoRoot = repoRootFrom(import.meta.url);
const sitePosts = path.join(repoRoot, "content", "posts");
const obsidianPosts = findObsidianPosts(args["obsidian-posts"] || "");
const dryRun = Boolean(args["dry-run"]);
const prune = Boolean(args.prune);

if (!new Set(["obsidian-to-site", "site-to-obsidian"]).has(direction)) {
  throw new Error(`Unsupported sync direction: ${direction}`);
}

function ensureDirectory(directory, create = false) {
  if (fs.existsSync(directory) && fs.statSync(directory).isDirectory()) return;
  if (create && !dryRun) {
    fs.mkdirSync(directory, { recursive: true });
    return;
  }
  throw new Error(`Folder not found: ${directory}`);
}

ensureDirectory(sitePosts);
ensureDirectory(obsidianPosts, direction === "site-to-obsidian");

const sourceDir = direction === "obsidian-to-site" ? obsidianPosts : sitePosts;
const destinationDir = direction === "obsidian-to-site" ? sitePosts : obsidianPosts;

function digest(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sameFile(left, right) {
  if (!fs.existsSync(right) || !fs.statSync(right).isFile()) return false;
  const leftBuffer = fs.readFileSync(left);
  const rightBuffer = fs.readFileSync(right);
  return leftBuffer.length === rightBuffer.length && digest(leftBuffer) === digest(rightBuffer);
}

const sourceEntries = fs.readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
  .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

const publishableNames = new Set();
let copied = 0;
let skipped = 0;

console.log(`Sync direction: ${direction}`);
console.log(`Source: ${sourceDir}`);
console.log(`Destination: ${destinationDir}`);

for (const entry of sourceEntries) {
  const sourcePath = path.join(sourceDir, entry.name);
  const source = fs.readFileSync(sourcePath, "utf8");
  if (!isPublishableMarkdown(entry.name, source)) {
    console.log(`Skipped draft: ${entry.name}`);
    skipped += 1;
    continue;
  }

  publishableNames.add(entry.name);
  const destinationPath = path.join(destinationDir, entry.name);
  if (sameFile(sourcePath, destinationPath)) continue;

  console.log(`${dryRun ? "Would copy" : "Copied"}: ${entry.name}`);
  if (!dryRun) fs.copyFileSync(sourcePath, destinationPath);
  copied += 1;
}

let removed = 0;
if (prune && direction === "obsidian-to-site") {
  const destinationEntries = fs.readdirSync(destinationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));

  for (const entry of destinationEntries) {
    if (publishableNames.has(entry.name)) continue;
    const destinationPath = path.join(destinationDir, entry.name);
    console.log(`${dryRun ? "Would remove" : "Removed"}: ${entry.name}`);
    if (!dryRun) fs.rmSync(destinationPath);
    removed += 1;
  }
}

console.log(`Sync complete: ${copied} copied, ${removed} removed, ${skipped} drafts skipped.`);

if (!dryRun && direction === "obsidian-to-site") {
  const script = args.publish ? "publish.mjs" : "build-site.mjs";
  const childArgs = [path.join(repoRoot, "scripts", script)];
  if (args.message) childArgs.push("--message", args.message);
  const result = spawnSync(process.execPath, childArgs, { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
