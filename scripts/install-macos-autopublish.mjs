import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findObsidianPosts, repoRootFrom } from "./obsidian-paths.mjs";

if (process.platform !== "darwin") throw new Error("This installer is for macOS only.");

const label = "top.sgecswtp.obsidian-autopublish";
const repoRoot = repoRootFrom(import.meta.url);
const obsidianPosts = findObsidianPosts();
const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
const logsDir = path.join(os.homedir(), "Library", "Logs", "sgecswtp-site");
const plistPath = path.join(launchAgentsDir, `${label}.plist`);
const uid = process.getuid();

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

fs.mkdirSync(launchAgentsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>-i</string>
    <string>HOME=${xml(os.homedir())}</string>
    <string>PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <string>OBSIDIAN_POSTS_DIR=${xml(obsidianPosts)}</string>
    <string>${xml(process.execPath)}</string>
    <string>${xml(path.join(repoRoot, "scripts", "watch-obsidian-posts.mjs"))}</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(repoRoot)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(path.join(logsDir, "autopublish.log"))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(logsDir, "autopublish-error.log"))}</string>
</dict>
</plist>
`;

fs.writeFileSync(plistPath, plist, "utf8");
spawnSync("launchctl", ["bootout", `gui/${uid}`, plistPath], { stdio: "ignore" });
const loaded = spawnSync("launchctl", ["bootstrap", `gui/${uid}`, plistPath], { encoding: "utf8" });
if (loaded.status !== 0) throw new Error(loaded.stderr || "Unable to load the macOS background publisher.");
spawnSync("launchctl", ["kickstart", "-k", `gui/${uid}/${label}`], { stdio: "inherit" });

console.log(`Automatic publishing installed: ${plistPath}`);
console.log(`Logs: ${logsDir}`);
