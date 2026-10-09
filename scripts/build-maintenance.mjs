// Builds the static site in maintenance mode: every route renders the maintenance screen.
// Cross-platform (Windows, macOS, Linux): runs Next's CLI with the current Node binary.
// Usage: npm run build:maintenance   then deploy the generated "out" folder as usual.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error("Could not find Next.js. Run this from the project root after installing dependencies.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_MAINTENANCE_MODE: "true" },
});

const forward = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", forward);
process.on("SIGTERM", forward);

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
