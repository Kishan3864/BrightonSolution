// Post-export fix for a Next.js static-export bug on Windows.
//
// Next writes each route's segment-prefetch file as "__next.<segment path>.txt", building the
// name from path.relative(), which uses backslashes on Windows. The backslash then becomes a
// folder: out/work/__next.work/__PAGE__.txt instead of out/work/__next.work.__PAGE__.txt.
// The client router requests the dotted name, so on a Windows build every prefetch 404s.
//
// This script flattens any "__next.*" folder in out/ back to the dotted file names the router
// requests. On macOS/Linux builds there is nothing to fix and it exits quietly. Safe to run twice.
// Runs automatically after "npm run build" and "npm run build:maintenance".
import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");

function filesUnder(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function segmentFolders(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name.startsWith("__next.")) found.push(full);
    else if (entry.name !== "_next") found.push(...segmentFolders(full));
  }
  return found;
}

if (!existsSync(outDir)) {
  console.log("fix-export-segments: no out/ folder, nothing to do");
  process.exit(0);
}

let moved = 0;
for (const folder of segmentFolders(outDir)) {
  const parent = dirname(folder);
  const prefix = folder.slice(parent.length + 1);
  for (const file of filesUnder(folder)) {
    const flatName = [prefix, ...relative(folder, file).split(sep)].join(".");
    const target = join(parent, flatName);
    rmSync(target, { force: true });
    renameSync(file, target);
    moved += 1;
  }
  rmSync(folder, { recursive: true, force: true });
}

console.log(
  moved > 0
    ? `fix-export-segments: flattened ${moved} segment prefetch file${moved === 1 ? "" : "s"}`
    : "fix-export-segments: nothing to fix",
);
