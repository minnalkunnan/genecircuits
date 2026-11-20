// Applies patches/ after `npm install` / `npm ci`.
//
// electron-installer-redhat is an optional, Linux/macOS-only dependency. On
// Windows npm may create a half-removed empty folder for it (it fails to clean
// up with EPERM), and patch-package then crashes. So only patch when we are on
// a supported platform AND the package is really installed (has a package.json).
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const supported = process.platform === "linux" || process.platform === "darwin";
const installed = existsSync(join(root, "node_modules", "electron-installer-redhat", "package.json"));

if (!supported || !installed) {
    console.log("apply-patches: electron-installer-redhat not available on this platform, skipping.");
    process.exit(0);
}

const bin = require.resolve("patch-package/index.js", { paths: [root] });
const result = spawnSync(process.execPath, [bin], { cwd: root, stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
