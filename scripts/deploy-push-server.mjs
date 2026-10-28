/**
 * Deploys push-server/ to the VPS (ssh host alias "vps-apps", the pm2 user; PUSH_SERVER_HOST to change):
 * syncs the alert wording (scripts/sync-push-notify.mjs), copies the code to ~/brightonsolution-push,
 * installs production dependencies when the lockfile changed, and starts or reloads it under pm2.
 * The first deploy also runs `pm2 save` so pm2 brings it back after a reboot (later deploys leave
 * the saved list of the server's other apps alone). Ends with a health check: the app must still be
 * online, without new restarts, a few seconds after the reload.
 *
 * The secrets (.env, service-account.json) stay on the server and are never copied; until they
 * exist the server waits for them (see push-server/index.js).
 *
 *   npm run push:deploy
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const HOST = process.env.PUSH_SERVER_HOST || "vps-apps";
const APP = "brightonsolution-push";
const REMOTE_DIR = "brightonsolution-push";
const FILES = ["package.json", "package-lock.json", "index.js", "notify.js", "ecosystem.config.cjs", ".env.example"].map((file) => `push-server/${file}`);

// On Windows use the system OpenSSH: its agent holds the key (VS Code Remote SSH uses the same one).
const WINDOWS_SSH = "C:\\Windows\\System32\\OpenSSH";
const tool = (name) => (process.platform === "win32" && existsSync(`${WINDOWS_SSH}\\${name}.exe`) ? `${WINDOWS_SSH}\\${name}.exe` : name);

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

run("node", ["scripts/sync-push-notify.mjs"]);
const lockHash = createHash("sha256").update(readFileSync("push-server/package-lock.json")).digest("hex");

const REMOTE = `
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh" >/dev/null
cd ~/${REMOTE_DIR}
for f in .env service-account.json; do
  if [ -f "$f" ]; then chmod 600 "$f"; else echo "deploy-push-server: $f is missing on the server; the push server waits for it."; fi
done
if [ ! -d node_modules ] || [ "$(cat .lock-sha256 2>/dev/null)" != "${lockHash}" ]; then
  npm ci --omit=dev --no-audit --no-fund --loglevel=error
  echo "${lockHash}" > .lock-sha256
else
  echo "deploy-push-server: dependencies unchanged"
fi
before=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(a=>a.name==="${APP}");console.log(p?p.pm2_env.restart_time:-1)})')
pm2 startOrReload ecosystem.config.cjs --update-env >/dev/null
grep -q '"${APP}"' "$HOME/.pm2/dump.pm2" 2>/dev/null || { pm2 save >/dev/null && echo "deploy-push-server: added to pm2's saved list (starts after a reboot)"; }
sleep 8
if ! pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(a=>a.name==="${APP}");if(!p){console.error("deploy-push-server: ${APP} is not in pm2");process.exit(1)}const restarts=p.pm2_env.restart_time-Math.max(0,'"$before"')-('"$before"'>=0?1:0);console.log("deploy-push-server: "+p.pm2_env.status+", node "+p.pm2_env.node_version+", unexpected restarts "+Math.max(0,restarts));if(p.pm2_env.status!=="online"||restarts>0)process.exit(1)})'; then
  echo "deploy-push-server: health check failed; recent logs:"
  pm2 logs ${APP} --lines 30 --nostream --raw 2>/dev/null | tail -30
  exit 1
fi
pm2 logs ${APP} --lines 6 --nostream --raw 2>/dev/null | tail -6
`;

run(tool("ssh"), [HOST, `mkdir -p ~/${REMOTE_DIR}`]);
run(tool("scp"), ["-q", ...FILES, `${HOST}:${REMOTE_DIR}/`]);
run(tool("ssh"), [HOST, REMOTE]);
console.log(`deploy-push-server: deployed to ${HOST}:~/${REMOTE_DIR} (logs: pm2 logs ${APP})`);
