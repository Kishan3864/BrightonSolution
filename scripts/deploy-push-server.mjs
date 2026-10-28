/**
 * Deploys push-server/ to the VPS (ssh host alias "vps-apps", the pm2 user; PUSH_SERVER_HOST to change):
 * syncs the alert wording (scripts/sync-push-notify.mjs), copies the code to ~/brightonsolution-push,
 * installs production dependencies and starts or reloads it under pm2, then `pm2 save` so pm2 brings
 * it back after a reboot. The secrets (.env, service-account.json) stay on the server and are never
 * copied; until they exist the server waits for them (see push-server/index.js).
 *
 *   npm run push:deploy
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const HOST = process.env.PUSH_SERVER_HOST || "vps-apps";
const REMOTE_DIR = "brightonsolution-push";
const FILES = ["package.json", "package-lock.json", "index.js", "notify.js", "ecosystem.config.cjs", ".env.example"].map((file) => `push-server/${file}`);

// On Windows use the system OpenSSH: its agent holds the key (VS Code Remote SSH uses the same one).
const WINDOWS_SSH = "C:\\Windows\\System32\\OpenSSH";
const tool = (name) => (process.platform === "win32" && existsSync(`${WINDOWS_SSH}\\${name}.exe`) ? `${WINDOWS_SSH}\\${name}.exe` : name);

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

const REMOTE = `
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh" >/dev/null
cd ~/${REMOTE_DIR}
for f in .env service-account.json; do
  if [ -f "$f" ]; then chmod 600 "$f"; else echo "deploy-push-server: $f is missing on the server; the push server waits for it."; fi
done
npm ci --omit=dev --no-audit --no-fund --loglevel=error
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save >/dev/null
pm2 describe brightonsolution-push | grep -E "status|restarts|uptime|node.js version" || true
`;

run("node", ["scripts/sync-push-notify.mjs"]);
run(tool("ssh"), [HOST, `mkdir -p ~/${REMOTE_DIR}`]);
run(tool("scp"), ["-q", ...FILES, `${HOST}:${REMOTE_DIR}/`]);
run(tool("ssh"), [HOST, REMOTE]);
console.log(`deploy-push-server: deployed to ${HOST}:~/${REMOTE_DIR} (logs: pm2 logs brightonsolution-push)`);
