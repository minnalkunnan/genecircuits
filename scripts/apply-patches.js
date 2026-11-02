// Applies patches/ after `npm install` / `npm ci`.
//
// electron-installer-redhat is an optional, Linux/macOS-only dependency, so on
// Windows it is never installed and patch-package would fail with
// "Patch file found for package ... which is not present". Skip in that case.
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");

if (!existsSync(join(root, "node_modules", "electron-installer-redhat"))) {
    console.log("apply-patches: electron-installer-redhat not installed on this platform, skipping.");
    process.exit(0);
}

const bin = require.resolve("patch-package/index.js", { paths: [root] });
const result = spawnSync(process.execPath, [bin], { cwd: root, stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
