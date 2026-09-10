import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs, repoRootFrom } from "./obsidian-paths.mjs";

const repoRoot = repoRootFrom(import.meta.url);
const args = parseArgs(process.argv.slice(2));
const message = args.message || "Publish Obsidian articles";
// GitHub Actions rebuilds `_site` from Markdown, so automatic commits only include
// the canonical article sources. This leaves unrelated design work untouched.
const managedPaths = ["content/posts"];

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_EDITOR: "true" },
  });
  if (result.status !== 0 && !options.allowFailure) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${commandArgs.join(" ")} failed${details ? `:\n${details}` : "."}`);
  }
  return result;
}

console.log("Building site...");
run(process.execPath, [path.join(repoRoot, "scripts", "build-site.mjs")]);

const siteRoot = path.join(repoRoot, "_site");
let verifiedLinks = 0;
for (const page of ["index.html", "archive.html", "tags.html"]) {
  const pagePath = path.join(siteRoot, page);
  if (!fs.existsSync(pagePath)) throw new Error(`Build did not produce _site/${page}`);
  const html = fs.readFileSync(pagePath, "utf8");
  for (const match of html.matchAll(/href="(posts\/[^"]+)"/g)) {
    const relativeLink = match[1];
    if (/[^\x00-\x7F]/.test(relativeLink)) throw new Error(`Post URL is not ASCII-only: ${relativeLink}`);
    if (!fs.existsSync(path.join(siteRoot, relativeLink))) throw new Error(`Missing generated post: ${relativeLink}`);
    verifiedLinks += 1;
  }
}
console.log(`Verified ${verifiedLinks} article links.`);

const stagedBefore = run("git", ["diff", "--cached", "--name-only", "-z"], { capture: true }).stdout.split("\0").filter(Boolean);
const unmanagedStaged = stagedBefore.filter((name) => !managedPaths.some((managed) => name === managed || name.startsWith(`${managed}/`)));
if (unmanagedStaged.length) {
  throw new Error(`Refusing to publish because unrelated files are already staged:\n${unmanagedStaged.join("\n")}`);
}

run("git", ["add", "-A", "--", ...managedPaths]);
const hasStagedChanges = run("git", ["diff", "--cached", "--quiet"], { allowFailure: true }).status !== 0;
if (!hasStagedChanges) {
  console.log("No article changes to publish.");
  process.exit(0);
}

run("git", ["commit", "-m", message]);
run("git", ["push"]);
console.log("Published to GitHub. GitHub Pages will deploy the new version automatically.");
