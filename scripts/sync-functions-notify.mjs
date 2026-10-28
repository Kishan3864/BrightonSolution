/**
 * Copies the alert wording into the Cloud Functions source: components/admin/data/notify.ts (pure,
 * type-only imports) is transpiled to functions/notify.js, so push alerts and in-app alerts read the
 * same. Runs as the functions predeploy hook (firebase.json) and can be run by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const SOURCE = "components/admin/data/notify.ts";
const TARGET = "functions/notify.js";

const { outputText } = ts.transpileModule(readFileSync(SOURCE, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, removeComments: false },
  fileName: SOURCE,
});
if (/^\s*import\s(?!type)/m.test(outputText)) {
  console.error(`sync-functions-notify: ${SOURCE} must not have runtime imports.`);
  process.exit(1);
}
writeFileSync(TARGET, `// Generated from ${SOURCE} by scripts/sync-functions-notify.mjs. Do not edit.\n${outputText}`);
console.log(`sync-functions-notify: wrote ${TARGET}`);
