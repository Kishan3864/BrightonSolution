/**
 * Builds the admin's own Firebase Hosting site (target "admin", admin.brightonsolution.com) from the
 * static export: out/admin.html becomes out-admin/index.html, with the build assets, icons and the
 * admin's manifest, service worker and robots.txt (admin-site/). Runs after `next build`.
 *
 * The page does not care that it is served at "/": its routes are hash-based (#/contacts ...) and
 * lib/analytics/env.ts treats the admin hosts like the /admin path (no public chrome, no tracking).
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";
const DEST = "out-admin";
const ROOT_FILES = ["icon.svg", "apple-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "badge-96.png", "logo.svg"];

const page = join(OUT, "admin.html");
if (!existsSync(page)) {
  console.error(`build-admin-site: ${page} is missing; run next build first.`);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

copyFileSync(page, join(DEST, "index.html"));
cpSync(join(OUT, "_next"), join(DEST, "_next"), { recursive: true });
for (const file of ROOT_FILES) {
  if (existsSync(join(OUT, file))) copyFileSync(join(OUT, file), join(DEST, file));
  else console.warn(`build-admin-site: ${file} not found in ${OUT}/`);
}
cpSync("admin-site", DEST, { recursive: true });

// Sanity checks: the page must be the admin page and link the manifest the admin site serves.
const html = readFileSync(join(DEST, "index.html"), "utf8");
if (!/noindex/.test(html) || !html.includes('rel="manifest"')) {
  console.error("build-admin-site: out-admin/index.html does not look like the admin page.");
  process.exit(1);
}
console.log(`build-admin-site: ${DEST}/ ready (admin page, assets, manifest, service worker).`);
