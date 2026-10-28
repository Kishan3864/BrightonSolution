/**
 * Copies the alert wording into the push server: components/admin/data/notify.ts (pure, type-only
 * imports) is transpiled to push-server/notify.js, so push alerts and in-app alerts read the same.
 * Runs first in scripts/deploy-push-server.mjs and can be run by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const SOURCE = "components/admin/data/notify.ts";
const TARGET = "push-server/notify.js";

const { outputText } = ts.transpileModule(readFileSync(SOURCE, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, removeComments: false },
  fileName: SOURCE,
});
if (/^\s*import\s(?!type)/m.test(outputText)) {
  console.error(`sync-push-notify: ${SOURCE} must not have runtime imports.`);
  process.exit(1);
}
writeFileSync(TARGET, `// Generated from ${SOURCE} by scripts/sync-push-notify.mjs. Do not edit.\n${outputText}`);
console.log(`sync-push-notify: wrote ${TARGET}`);
