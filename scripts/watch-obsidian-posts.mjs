import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  findObsidianPosts,
  isPublishableMarkdown,
  parseArgs,
  repoRootFrom,
} from "./obsidian-paths.mjs";

const args = parseArgs(process.argv.slice(2));
const repoRoot = repoRootFrom(import.meta.url);
const obsidianPosts = findObsidianPosts(args["obsidian-posts"] || "");
const debounceMs = Math.max(10, Number(args.debounce || 60)) * 1000;
const pollMs = Math.max(3, Number(args.poll || 10)) * 1000;
const retryMs = Math.max(60, Number(args.retry || 300)) * 1000;

if (!fs.existsSync(obsidianPosts)) throw new Error(`Obsidian posts folder not found: ${obsidianPosts}`);

function timestamp() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

function snapshot() {
  const hash = crypto.createHash("sha256");
  const entries = fs.readdirSync(obsidianPosts, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

  for (const entry of entries) {
    const fullPath = path.join(obsidianPosts, entry.name);
    const source = fs.readFileSync(fullPath);
    if (!isPublishableMarkdown(entry.name, source.toString("utf8"))) continue;
    hash.update(entry.name).update("\0").update(source).update("\0");
  }
  return hash.digest("hex");
}

function publish() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      path.join(repoRoot, "scripts", "sync-obsidian-posts.mjs"),
      "--direction", "obsidian-to-site",
      "--prune",
      "--publish",
      "--message", "Auto publish Obsidian articles",
    ], { cwd: repoRoot, stdio: "inherit" });
    child.once("error", () => resolve(false));
    child.once("exit", (code) => resolve(code === 0));
  });
}

let lastSnapshot = snapshot();
let pendingSince = 0;
let retryAt = 0;
let publishing = false;

log(`Watching: ${obsidianPosts}`);
log(`A publish starts after ${debounceMs / 1000} seconds without further edits.`);

setInterval(async () => {
  if (publishing) return;
  let currentSnapshot;
  try {
    currentSnapshot = snapshot();
  } catch (error) {
    log(`Unable to read the article folder: ${error.message}`);
    return;
  }

  if (currentSnapshot !== lastSnapshot) {
    lastSnapshot = currentSnapshot;
    pendingSince = Date.now();
    retryAt = 0;
    log("Article change detected; publish queued.");
    return;
  }

  const now = Date.now();
  const debounceReady = pendingSince && now - pendingSince >= debounceMs;
  const retryReady = retryAt && now >= retryAt;
  if (!debounceReady && !retryReady) return;

  publishing = true;
  pendingSince = 0;
  retryAt = 0;
  log("Starting publish.");
  const beforePublish = lastSnapshot;
  const succeeded = await publish();
  publishing = false;

  const afterPublish = snapshot();
  lastSnapshot = afterPublish;
  if (!succeeded) {
    retryAt = Date.now() + retryMs;
    log(`Publish failed; retry scheduled in ${retryMs / 60000} minutes.`);
  } else if (afterPublish !== beforePublish) {
    pendingSince = Date.now();
    log("More edits arrived during publishing; another publish is queued.");
  } else {
    log("Publish finished.");
  }
}, pollMs);
