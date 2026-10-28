/**
 * BrightonSolution push server: instant push alerts to the admin app (brightonsolution-admin.web.app).
 *
 * Runs on the Hostinger VPS under pm2 (ecosystem.config.cjs; `npm run push:deploy` from the repo
 * root, see scripts/deploy-push-server.mjs). It keeps Firestore listeners open on contacts/ (website
 * contact form) and leads/ (private landing page) and pushes every new document to each subscribed
 * admin device (pushSubscriptions/, saved by the admin app, see components/admin/data/push.ts) within
 * a second, open app or not. The wording is components/admin/data/notify.ts, copied to notify.js by
 * scripts/sync-push-notify.mjs on every deploy.
 *
 * - pushTests/ (Settings > Send test push): a sample alert goes to every device, then the document
 *   is deleted.
 * - pushLog/{kind}-{id} records each enquiry pushed, so a restart or the catch-up poll never alerts
 *   twice. The poll (every 2 minutes) is a safety net for a listener that stalls; if it finds an
 *   enquiry the listener missed, the listeners are reopened.
 * - After downtime it catches up on enquiries since it last ran (state.json), up to 24 hours back;
 *   more than CATCH_UP_SINGLES of them arrive as one summary alert.
 * - pushServer/status gets `lastSeen` every 5 minutes; Settings in the admin shows it.
 * - Subscriptions the push service reports as gone (404/410) are deleted.
 *
 * Needs two files next to this one, never in git: .env (VAPID keys, see .env.example) and
 * service-account.json (Firestore access; role Cloud Datastore User). Until both exist it waits and
 * checks again every 15 seconds. Logs never contain enquiry contents, only document ids and counts.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";
import { contactNotification, leadNotification, summaryNotification } from "./notify.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(DIR, ".env");
const STATE_FILE = join(DIR, "state.json");
const VERSION = JSON.parse(readFileSync(join(DIR, "package.json"), "utf8")).version;

/** A push the phone has not received within a day is dropped by the push service. */
const TTL_SECONDS = 24 * 3600;
/** How far back to catch up after downtime (pushes older than the TTL would be pointless). */
const CATCH_UP_MAX_MS = 24 * 3600 * 1000;
/** Up to this many missed enquiries are pushed one by one after downtime; more become one summary. */
const CATCH_UP_SINGLES = 3;
/** First start ever (no state.json): only enquiries from the last 2 minutes, never the history. */
const FIRST_RUN_LOOKBACK_MS = 2 * 60 * 1000;
const POLL_MS = 2 * 60 * 1000;
/** The poll and reopened listeners look this far back. */
const WINDOW_MS = 30 * 60 * 1000;
/** An enquiry this old that only the poll found means the listener missed it. */
const MISSED_AFTER_MS = 45 * 1000;
const RELISTEN_MS = 60 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;
const STATE_MS = 60 * 1000;
const CLEANUP_MS = 24 * 3600 * 1000;
const LOG_KEEP_MS = 30 * 24 * 3600 * 1000;
/** A test request older than this (made while the server was down) is deleted without a push. */
const TEST_MAX_AGE_MS = 10 * 60 * 1000;
/** Rounds (poll ticks) an enquiry is retried when every device failed with a temporary error. */
const MAX_ROUNDS = 5;
/** Tries per device within one round, for temporary errors (network, 429, 5xx). */
const DEVICE_TRIES = 3;

const SOURCES = [
  { kind: "contact", collection: "contacts", build: contactNotification },
  { kind: "lead", collection: "leads", build: leadNotification },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(level, message, fields) {
  const line = fields ? `${message} ${JSON.stringify(fields)}` : message;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(`[${level}] ${line}`);
}

const errorText = (error) => String(error?.message ?? error);

/* ------------------------------------------------------------------ setup */

async function waitForFiles(paths) {
  let warned = false;
  while (!paths.every((path) => existsSync(path))) {
    if (!warned) {
      log("warn", "Waiting for config files", { missing: paths.filter((path) => !existsSync(path)).map((path) => relative(DIR, path)) });
      warned = true;
    }
    await sleep(15_000);
  }
  if (warned) log("info", "Config files found");
}

await waitForFiles([ENV_FILE]);
process.loadEnvFile(ENV_FILE);
const CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(DIR, "service-account.json");
await waitForFiles([CREDENTIALS]);

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@brightonsolution.com";
const LABEL = process.env.PUSH_SERVER_LABEL || "VPS";
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  log("error", ".env must set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

initializeApp({ credential: cert(JSON.parse(readFileSync(CREDENTIALS, "utf8"))) });
const db = getFirestore();

/* ------------------------------------------------------------------ state */

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

/** False until catchUp() has run; until then a restart must catch up from the same point. */
let caughtUp = false;

function writeState() {
  try {
    const at = caughtUp ? Date.now() : floorMs + 60_000;
    writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify({ lastRunningAt: new Date(at).toISOString(), version: VERSION }));
    renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
  } catch (error) {
    log("warn", "Could not write state.json", { error: errorText(error) });
  }
}

const startedAt = Date.now();
const previousRun = Date.parse(readState().lastRunningAt ?? "");
/** Enquiries created before this are never pushed. */
const floorMs = Number.isFinite(previousRun)
  ? Math.max(startedAt - CATCH_UP_MAX_MS, Math.min(previousRun, startedAt) - 60_000)
  : startedAt - FIRST_RUN_LOOKBACK_MS;

/** Firestore data with Timestamps turned into Dates (notify.js expects createdAt as a Date). */
function plain(data, id) {
  const out = { ...data, id };
  for (const [key, value] of Object.entries(out)) {
    if (value && typeof value.toDate === "function") out[key] = value.toDate();
  }
  return out;
}

function createdMs(doc) {
  const value = doc.get("createdAt");
  return value && typeof value.toMillis === "function" ? value.toMillis() : 0;
}

/* ------------------------------------------------------------------ sending */

function isTemporary(error) {
  const status = error?.statusCode;
  if (typeof status === "number") return status === 429 || status >= 500;
  // Network errors (ECONNRESET, ETIMEDOUT, EAI_AGAIN, ...) and web-push's socket timeout.
  return (typeof error?.code === "string" && /^E[A-Z_]+$/.test(error.code)) || /timeout/i.test(errorText(error));
}

/** "sent" | "expired" | "temporary" | "failed"; never throws. */
async function sendTo(doc, body) {
  const { endpoint, p256dh, auth } = doc.data();
  for (let attempt = 1; ; attempt += 1) {
    try {
      await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, body, { TTL: TTL_SECONDS, urgency: "high", timeout: 15_000 });
      return "sent";
    } catch (error) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) {
        await doc.ref.delete().catch(() => undefined);
        log("info", "Removed an expired subscription", { device: doc.id.slice(0, 8) });
        return "expired";
      }
      const temporary = isTemporary(error);
      if (temporary && attempt < DEVICE_TRIES) {
        await sleep(attempt * 2000);
        continue;
      }
      log("warn", "Push failed", { device: doc.id.slice(0, 8), status: status ?? error?.code ?? "error", temporary });
      return temporary ? "temporary" : "failed";
    }
  }
}

async function pushToAll(payload) {
  const subscriptions = await db.collection("pushSubscriptions").get();
  const body = JSON.stringify(payload);
  const results = await Promise.all(subscriptions.docs.map((doc) => sendTo(doc, body)));
  const count = (value) => results.filter((result) => result === value).length;
  return { devices: subscriptions.size, sent: count("sent"), expired: count("expired"), temporary: count("temporary"), failed: count("failed") };
}

function outcome(result) {
  if (!result.devices) return { level: "warn", message: "No device has push on" };
  if (!result.sent) return { level: "error", message: "Push not delivered" };
  return { level: "info", message: "Pushed" };
}

/* ------------------------------------------------------------------ enquiries */

/** key -> time handled (pushed, or found in pushLog). Pruned daily. */
const handled = new Map();
/** key -> in-flight promise, so the listener and the poll never push the same enquiry at once. */
const inflight = new Map();
/** key -> rounds that ended with only temporary failures. */
const rounds = new Map();

const keyOf = (source, doc) => `${source.kind}-${doc.id}`;
const logRef = (key) => db.collection("pushLog").doc(key);

function logEntry(source, doc, result, extra = {}) {
  return { kind: source.kind, docId: doc.id, enquiryAt: doc.get("createdAt") ?? null, pushedAt: FieldValue.serverTimestamp(), server: VERSION, ...result, ...extra };
}

function handle(source, doc) {
  const key = keyOf(source, doc);
  if (handled.has(key)) return Promise.resolve();
  if (inflight.has(key)) return inflight.get(key);
  const run = (async () => {
    if (createdMs(doc) < floorMs) return;
    if ((await logRef(key).get()).exists) {
      handled.set(key, Date.now());
      return;
    }
    const result = await pushToAll(source.build(plain(doc.data(), doc.id)));
    const round = (rounds.get(key) ?? 0) + 1;
    if (result.devices > 0 && result.sent === 0 && result.temporary > 0 && round < MAX_ROUNDS) {
      rounds.set(key, round);
      log("warn", "Push will be retried by the next poll", { key, round, ...result });
      return;
    }
    rounds.delete(key);
    await logRef(key).set(logEntry(source, doc, result));
    handled.set(key, Date.now());
    const { level, message } = outcome(result);
    log(level, message, { key, ...result });
  })()
    .catch((error) => log("error", "Could not push an enquiry", { key, error: errorText(error) }))
    .finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

/**
 * Startup: enquiries since the last run that were never pushed (the server was down). A few are
 * pushed one by one; more become one summary alert and are logged as pushed.
 */
async function catchUp() {
  const since = Timestamp.fromMillis(floorMs);
  const missed = [];
  for (const source of SOURCES) {
    const snapshot = await db.collection(source.collection).where("createdAt", ">", since).orderBy("createdAt").limit(200).get();
    const logs = snapshot.empty ? [] : await db.getAll(...snapshot.docs.map((doc) => logRef(keyOf(source, doc))));
    snapshot.docs.forEach((doc, index) => {
      if (logs[index].exists) handled.set(keyOf(source, doc), Date.now());
      else missed.push({ source, doc });
    });
  }
  if (missed.length <= CATCH_UP_SINGLES) {
    await Promise.all(missed.map(({ source, doc }) => handle(source, doc)));
  } else {
    const leads = missed.filter(({ source }) => source.kind === "lead").length;
    const result = await pushToAll(summaryNotification(leads, missed.length - leads));
    const batch = db.batch();
    for (const { source, doc } of missed) batch.set(logRef(keyOf(source, doc)), logEntry(source, doc, result, { summary: true }));
    await batch.commit();
    for (const { source, doc } of missed) handled.set(keyOf(source, doc), Date.now());
    const { level, message } = outcome(result);
    log(level, `${message} (summary of missed enquiries)`, { leads, contacts: missed.length - leads, ...result });
  }
  caughtUp = true;
}

async function handleTest(doc) {
  const key = `test-${doc.id}`;
  if (inflight.has(key) || handled.has(key)) return;
  const run = (async () => {
    if (Date.now() - createdMs(doc) <= TEST_MAX_AGE_MS) {
      const sample = leadNotification({
        id: "test",
        kind: "plan",
        name: "Test enquiry",
        company: "BrightonSolution",
        plan: "Growth",
        price: 79999,
        currency: "INR",
        phone: "+91 98765 43210",
        email: "test@example.com",
        contactPref: "WhatsApp",
        createdAt: new Date(),
      });
      const result = await pushToAll({
        ...sample,
        title: `Test · ${sample.title}`,
        tag: `test-${doc.id}`,
        data: { url: "#/settings", kind: "summary", id: "" },
        actions: [{ action: "open", title: "Open admin" }],
      });
      const { level, message } = outcome(result);
      log(level, `${message} (test)`, result);
    }
    await doc.ref.delete();
    handled.set(key, Date.now());
  })()
    .catch((error) => log("error", "Test push failed", { error: errorText(error) }))
    .finally(() => inflight.delete(key));
  inflight.set(key, run);
  await run;
}

/* ------------------------------------------------------------------ listeners and poll */

let unsubscribers = [];
let relistenTimer = null;
let stopping = false;

function sinceTimestamp() {
  return Timestamp.fromMillis(Math.max(floorMs, Date.now() - WINDOW_MS));
}

function stopListening() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
}

function scheduleRelisten(reason) {
  if (relistenTimer || stopping) return;
  log("warn", "Reopening listeners in 10 s", { reason });
  relistenTimer = setTimeout(() => {
    relistenTimer = null;
    listen();
  }, 10_000);
}

function listen() {
  if (stopping) return;
  stopListening();
  const since = sinceTimestamp();
  for (const source of SOURCES) {
    unsubscribers.push(
      db
        .collection(source.collection)
        .where("createdAt", ">", since)
        .orderBy("createdAt")
        .onSnapshot(
          (snapshot) => {
            for (const change of snapshot.docChanges()) if (change.type === "added") void handle(source, change.doc);
          },
          (error) => scheduleRelisten(`${source.collection}: ${error?.code ?? errorText(error)}`),
        ),
    );
  }
  unsubscribers.push(
    db.collection("pushTests").onSnapshot(
      (snapshot) => {
        for (const change of snapshot.docChanges()) if (change.type === "added") void handleTest(change.doc);
      },
      (error) => scheduleRelisten(`pushTests: ${error?.code ?? errorText(error)}`),
    ),
  );
}

async function poll() {
  if (!caughtUp) await catchUp();
  const since = sinceTimestamp();
  let missed = false;
  for (const source of SOURCES) {
    const snapshot = await db.collection(source.collection).where("createdAt", ">", since).orderBy("createdAt").limit(200).get();
    for (const doc of snapshot.docs) {
      const key = keyOf(source, doc);
      if (handled.has(key) || inflight.has(key)) continue;
      if (!rounds.has(key) && Date.now() - createdMs(doc) > MISSED_AFTER_MS) missed = true;
      void handle(source, doc);
    }
  }
  if (missed) scheduleRelisten("the poll found an enquiry the listener missed");
}

/* ------------------------------------------------------------------ upkeep */

async function heartbeat() {
  await db.collection("pushServer").doc("status").set({
    lastSeen: FieldValue.serverTimestamp(),
    startedAt: Timestamp.fromMillis(startedAt),
    version: VERSION,
    label: LABEL,
  });
}

async function cleanup() {
  // The poll and listeners never look back further than WINDOW_MS, so older keys can go.
  const keepAfter = Date.now() - 2 * CATCH_UP_MAX_MS;
  for (const [key, at] of handled) if (at < keepAfter) handled.delete(key);
  const old = await db.collection("pushLog").where("pushedAt", "<", Timestamp.fromMillis(Date.now() - LOG_KEEP_MS)).limit(300).get();
  if (old.empty) return;
  const batch = db.batch();
  for (const doc of old.docs) batch.delete(doc.ref);
  await batch.commit();
  log("info", "Removed old push log entries", { count: old.size });
}

const timers = [];

function every(ms, task, name) {
  timers.push(
    setInterval(() => {
      Promise.resolve()
        .then(task)
        .catch((error) => log("warn", `${name} failed`, { error: errorText(error) }));
    }, ms),
  );
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log("info", "Stopping", { signal });
  for (const timer of timers) clearInterval(timer);
  if (relistenTimer) clearTimeout(relistenTimer);
  stopListening();
  await Promise.race([Promise.allSettled([...inflight.values()]), sleep(10_000)]);
  writeState();
  await db.terminate().catch(() => undefined);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => log("error", "Unhandled rejection", { error: errorText(error) }));

/* ------------------------------------------------------------------ start */

try {
  await heartbeat();
} catch (error) {
  // Wrong or revoked key, missing role, wrong project: exit so pm2 shows it (and retries with backoff).
  log("error", "Cannot reach Firestore with service-account.json", { code: error?.code ?? null, error: errorText(error) });
  process.exit(1);
}
log("info", "Push server running", { version: VERSION, since: new Date(floorMs).toISOString() });
await catchUp().catch((error) => log("warn", "Catch-up failed; the next poll tries again", { error: errorText(error) }));
writeState();
listen();
every(POLL_MS, poll, "Poll");
every(RELISTEN_MS, listen, "Relisten");
every(HEARTBEAT_MS, heartbeat, "Heartbeat");
every(STATE_MS, writeState, "State");
every(CLEANUP_MS, cleanup, "Clean-up");
