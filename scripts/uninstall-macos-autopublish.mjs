import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") throw new Error("This uninstaller is for macOS only.");

const label = "top.sgecswtp.obsidian-autopublish";
const plistPath = path.join(os.homedir(), "Library", "LaunchAgents", `${label}.plist`);
spawnSync("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath], { stdio: "ignore" });
if (fs.existsSync(plistPath)) fs.rmSync(plistPath);
console.log("Automatic publishing removed. Existing log files were kept.");
