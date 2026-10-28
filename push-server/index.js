/**
 * BrightonSolution push server: instant push alerts to the admin app (brightonsolution-admin.web.app).
 *
 * Runs on the Hostinger VPS under pm2 (ecosystem.config.cjs; `npm run push:deploy` from the repo
 * root, see scripts/deploy-push-server.mjs). Every new contacts/ (website contact form) and leads/
 * (private landing page) document is pushed to each subscribed admin device (pushSubscriptions/,
 * saved by the admin app, see components/admin/data/push.ts), open app or not. The wording is
 * components/admin/data/notify.ts, copied to notify.js by scripts/sync-push-notify.mjs on deploy.
 *
 * Two paths, one record:
 * - Live: Firestore listeners push an enquiry within a second of it being created (at most
 *   LIVE_BURST alerts per LIVE_WINDOW_MS; a flood is left to the check below).
 * - Check (every 2 minutes and at start): reads enquiries created after the cursor, the time up to
 *   which every enquiry is known to be dealt with. Anything not pushed yet (the server was down, a
 *   listener stalled, Firestore reads failed for a while, a flood) is pushed: up to CATCH_UP_SINGLES
 *   one by one, more as one summary alert. The cursor only moves after a successful check, and is
 *   kept in state.json, so outages and restarts never lose an alert (up to 24 hours back).
 * - pushLog/{kind}-{id} records each enquiry dealt with, so nothing is pushed twice; a repeat would
 *   only replace the same notification (each enquiry has its own tag).
 * - pushTests/ (Settings > Send test push): a sample alert goes to every device, then the document
 *   is deleted.
 * - pushServer/status: `lastSeen` every 5 minutes plus the outcome of the last alert; Settings in
 *   the admin shows both. Subscriptions the push service reports as gone (404/410) are deleted.
 *
 * Needs two files next to this one, never in git: .env (VAPID keys, see .env.example) and
 * service-account.json (Firestore access; role Cloud Datastore User). Until both exist it waits and
 * checks again every 15 seconds. Logs never contain enquiry contents, only document ids and counts.
 */
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";
import { contactNotification, leadNotification, summaryNotification } from "./notify.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(DIR, ".env");
const CREDENTIALS = join(DIR, "service-account.json");
const STATE_FILE = join(DIR, "state.json");
const VERSION = JSON.parse(readFileSync(join(DIR, "package.json"), "utf8")).version;

/** A push the phone has not received within a day is dropped by the push service. */
const TTL_SECONDS = 24 * 3600;
/** How far back the check ever looks (pushes older than the TTL would be pointless). */
const CATCH_UP_MAX_MS = 24 * 3600 * 1000;
/** First start ever (no state.json): only enquiries from the last 2 minutes, never the history. */
const FIRST_RUN_LOOKBACK_MS = 2 * 60 * 1000;
/** Up to this many enquiries found by one check are pushed one by one; more become one summary. */
const CATCH_UP_SINGLES = 3;
const CHECK_MS = 2 * 60 * 1000;
/** Each check re-reads this much before the cursor, in case of late commits. */
const OVERLAP_MS = 60 * 1000;
const PAGE = 300;
/** The listeners only push enquiries at most this old; older ones are left to the check. */
const FRESH_MS = 2 * 60 * 1000;
const LIVE_BURST = 5;
const LIVE_WINDOW_MS = 2 * 60 * 1000;
/** An enquiry this old that only the check found, though the listeners were open, means they missed it. */
const MISSED_AFTER_MS = 45 * 1000;
const RELISTEN_MS = 60 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;
const STATE_MS = 60 * 1000;
const CLEANUP_MS = 24 * 3600 * 1000;
const LOG_KEEP_MS = 30 * 24 * 3600 * 1000;
/** A test request older than this (made while the server was down) is deleted without a push. */
const TEST_MAX_AGE_MS = 10 * 60 * 1000;
/** Checks an enquiry is retried when every device failed with a temporary error. */
const MAX_ROUNDS = 5;
/** Tries per device within one push, for temporary errors (network, 429, 5xx). */
const DEVICE_TRIES = 3;
/** Hard limit per request (web-push's own timeout only covers an idle socket). */
const SEND_TIMEOUT_MS = 30_000;
/** Web Push allows 4 KB of encrypted payload; stay well below with the JSON. */
const MAX_PAYLOAD_BYTES = 3000;

const SOURCES = [
  { kind: "contact", collection: "contacts", build: contactNotification },
  { kind: "lead", collection: "leads", build: leadNotification },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errorText = (error) => String(error?.message ?? error);

function log(level, message, fields) {
  const line = fields ? `${message} ${JSON.stringify(fields)}` : message;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(`[${level}] ${line}`);
}

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
  for (const path of paths) {
    try {
      chmodSync(path, 0o600);
    } catch {
      /* not the owner: leave it */
    }
  }
  if (warned) log("info", "Config files found", { files: paths.map((path) => relative(DIR, path)) });
}

await waitForFiles([ENV_FILE, CREDENTIALS]);
// Only this file counts: variables inherited from pm2 or the shell never override it.
const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
const VAPID_SUBJECT = env.VAPID_SUBJECT || "mailto:support@brightonsolution.com";
const LABEL = env.PUSH_SERVER_LABEL || "VPS";
if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  log("error", ".env must set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

initializeApp({ credential: cert(JSON.parse(readFileSync(CREDENTIALS, "utf8"))) });
const db = getFirestore();

/* ------------------------------------------------------------------ state */

const startedAt = Date.now();

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

const savedCursor = Date.parse(readState().cursor ?? "");
/** Every enquiry created at or before this time (server clock) has been dealt with. */
let cursorMs = Math.max(startedAt - CATCH_UP_MAX_MS, Number.isFinite(savedCursor) ? Math.min(savedCursor, startedAt) : startedAt - FIRST_RUN_LOOKBACK_MS);

function writeState() {
  try {
    writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify({ cursor: new Date(cursorMs).toISOString(), version: VERSION }));
    renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
  } catch (error) {
    log("warn", "Could not write state.json", { error: errorText(error) });
  }
}

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
  // Network errors (ECONNRESET, ETIMEDOUT, EAI_AGAIN, ...) and timeouts.
  return (typeof error?.code === "string" && /^E[A-Z_]+$/.test(error.code)) || /timeout/i.test(errorText(error));
}

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value));
}

function cutBytes(text, max) {
  let out = String(text ?? "");
  while (Buffer.byteLength(out) > max) out = out.slice(0, Math.max(0, out.length - Math.ceil((Buffer.byteLength(out) - max) / 3) - 1));
  return out.length < String(text ?? "").length ? `${out.trimEnd()}…` : out;
}

/** Keeps the payload under the Web Push size limit (long non-Latin enquiries can exceed it). */
function fit(payload) {
  if (bytes(payload) <= MAX_PAYLOAD_BYTES) return payload;
  const out = { ...payload, data: { ...payload.data } };
  // The prefilled WhatsApp greeting is the largest optional part (URL-encoded).
  if (out.data.whatsapp) out.data.whatsapp = out.data.whatsapp.split("?")[0];
  if (bytes(out) <= MAX_PAYLOAD_BYTES) return out;
  out.title = cutBytes(out.title, 200);
  out.body = cutBytes(out.body, 900);
  if (bytes(out) <= MAX_PAYLOAD_BYTES) return out;
  out.body = cutBytes(out.body, 300);
  return out;
}

/** "sent" | "expired" | {temporary|failed: status}; never throws. */
async function sendTo(doc, body) {
  const { endpoint, p256dh, auth } = doc.data();
  for (let attempt = 1; ; attempt += 1) {
    try {
      await Promise.race([
        webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, body, { TTL: TTL_SECONDS, urgency: "high", timeout: 15_000 }),
        sleep(SEND_TIMEOUT_MS).then(() => {
          throw new Error("Send timeout");
        }),
      ]);
      return { outcome: "sent" };
    } catch (error) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) {
        await doc.ref.delete().catch(() => undefined);
        log("info", "Removed an expired subscription", { device: doc.id.slice(0, 8) });
        return { outcome: "expired" };
      }
      const temporary = isTemporary(error);
      if (temporary && attempt < DEVICE_TRIES) {
        await sleep(attempt * 2000);
        continue;
      }
      const code = String(status ?? error?.code ?? "error");
      log("warn", "Push failed", { device: doc.id.slice(0, 8), status: code, temporary });
      return { outcome: temporary ? "temporary" : "failed", code };
    }
  }
}

async function pushToAll(payload) {
  const subscriptions = await db.collection("pushSubscriptions").get();
  const body = JSON.stringify(fit(payload));
  const results = await Promise.all(subscriptions.docs.map((doc) => sendTo(doc, body)));
  const count = (value) => results.filter((result) => result.outcome === value).length;
  const result = { devices: subscriptions.size, sent: count("sent"), expired: count("expired"), temporary: count("temporary"), failed: count("failed") };
  const code = results.find((r) => r.code)?.code ?? "";
  // Settings shows the outcome of the last alert; a failed write here only costs that line.
  db.collection("pushServer")
    .doc("status")
    .set({ lastPushAt: FieldValue.serverTimestamp(), lastPushDevices: result.devices, lastPushSent: result.sent, lastPushError: result.sent ? "" : code }, { merge: true })
    .catch((error) => log("warn", "Could not record the push outcome", { error: errorText(error) }));
  return result;
}

function outcome(result) {
  if (!result.devices) return { level: "warn", message: "No device has push on" };
  if (!result.sent) return { level: "error", message: "Push not delivered" };
  return { level: "info", message: "Pushed" };
}

/** Temporary failures on every device: try again at the next check (up to MAX_ROUNDS). */
const retryLater = (result) => result.devices > 0 && result.sent === 0 && result.temporary > 0;

/* ------------------------------------------------------------------ enquiries */

/** key -> time dealt with in this process (pushed, summarised, given up, or found in pushLog). */
const handled = new Map();
/** key -> in-flight promise, so the listeners and the check never push the same enquiry at once. */
const inflight = new Map();
/** key -> checks that ended with only temporary failures. */
const rounds = new Map();
/** Enquiries the live path skipped because of LIVE_BURST; the check summarises them. */
const burstSkipped = new Set();
const livePushes = [];

const keyOf = (source, doc) => `${source.kind}-${doc.id}`;
const logRef = (key) => db.collection("pushLog").doc(key);

function logEntry(source, doc, result, extra = {}) {
  return { kind: source.kind, docId: doc.id, enquiryAt: doc.get("createdAt") ?? null, pushedAt: FieldValue.serverTimestamp(), server: VERSION, ...result, ...extra };
}

/** Writes pushLog entries (retried); the enquiries are already marked handled in memory. */
async function record(entries) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      for (let i = 0; i < entries.length; i += 400) {
        const batch = db.batch();
        for (const [key, data] of entries.slice(i, i + 400)) batch.set(logRef(key), data);
        await batch.commit();
      }
      return;
    } catch (error) {
      if (attempt === 3) log("warn", "Could not write the push log", { keys: entries.length, error: errorText(error) });
      else await sleep(attempt * 5000);
    }
  }
}

function settle(key) {
  handled.set(key, Date.now());
  rounds.delete(key);
  burstSkipped.delete(key);
}

/** Pushes one enquiry unless it was already dealt with. Never throws. */
function handle(source, doc) {
  const key = keyOf(source, doc);
  if (handled.has(key)) return Promise.resolve();
  if (inflight.has(key)) return inflight.get(key);
  const run = (async () => {
    if ((await logRef(key).get()).exists) {
      settle(key);
      return;
    }
    const result = await pushToAll(source.build(plain(doc.data(), doc.id)));
    const round = (rounds.get(key) ?? 0) + 1;
    if (retryLater(result) && round < MAX_ROUNDS) {
      rounds.set(key, round);
      log("warn", "Push will be retried at the next check", { key, round, ...result });
      return;
    }
    settle(key);
    const { level, message } = outcome(result);
    log(level, message, { key, ...result });
    await record([[key, logEntry(source, doc, result)]]);
  })()
    .catch((error) => {
      // Errors count as rounds too, so one broken enquiry cannot hold the cursor back for a day.
      const round = (rounds.get(key) ?? 0) + 1;
      if (round < MAX_ROUNDS) {
        rounds.set(key, round);
        log("error", "Could not push an enquiry; the next check tries again", { key, round, error: errorText(error) });
        return;
      }
      settle(key);
      log("error", "Gave up on an enquiry", { key, error: errorText(error) });
      return record([[key, logEntry(source, doc, { error: true })]]);
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

/** Live path (listeners): fresh enquiries only, within the burst budget. */
function handleLive(source, doc) {
  const key = keyOf(source, doc);
  if (handled.has(key) || inflight.has(key) || stopping) return;
  if (Date.now() - createdMs(doc) > FRESH_MS) return;
  const now = Date.now();
  while (livePushes.length && now - livePushes[0] > LIVE_WINDOW_MS) livePushes.shift();
  if (livePushes.length >= LIVE_BURST) {
    if (!burstSkipped.size) log("warn", "Many enquiries at once: the next check sends one summary");
    burstSkipped.add(key);
    return;
  }
  livePushes.push(now);
  void handle(source, doc);
}

/** One alert for many enquiries; all of them are logged as summarised. */
async function summarise(items) {
  const keys = items.map(({ source, doc }) => keyOf(source, doc));
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  for (const key of keys) inflight.set(key, gate);
  try {
    const leads = items.filter(({ source }) => source.kind === "lead").length;
    const contacts = items.length - leads;
    const summary = summaryNotification(leads, contacts);
    const result = await pushToAll({ ...summary, tag: `summary-${Date.now()}` });
    const round = Math.max(0, ...keys.map((key) => rounds.get(key) ?? 0)) + 1;
    if (retryLater(result) && round < MAX_ROUNDS) {
      for (const key of keys) rounds.set(key, round);
      log("warn", "Summary will be retried at the next check", { leads, contacts, round, ...result });
      return;
    }
    for (const key of keys) settle(key);
    const { level, message } = outcome(result);
    log(level, `${message} (one summary)`, { leads, contacts, ...result });
    await record(items.map(({ source, doc }) => [keyOf(source, doc), logEntry(source, doc, result, { summary: true })]));
  } finally {
    for (const key of keys) inflight.delete(key);
    release();
  }
}

/* ------------------------------------------------------------------ the check */

let checking = null;
let listeningSince = Infinity;

async function readSince(source, sinceMs) {
  const docs = [];
  let readTime = Infinity;
  let query = db.collection(source.collection).where("createdAt", ">", Timestamp.fromMillis(sinceMs)).orderBy("createdAt").limit(PAGE);
  for (;;) {
    const snapshot = await query.get();
    readTime = Math.min(readTime, snapshot.readTime?.toMillis?.() ?? Date.now());
    docs.push(...snapshot.docs);
    if (snapshot.size < PAGE) return { docs, readTime };
    query = query.startAfter(snapshot.docs[snapshot.size - 1]);
  }
}

async function runCheck() {
  const sinceMs = Math.max(Date.now() - CATCH_UP_MAX_MS, cursorMs - OVERLAP_MS);
  const found = [];
  let readTime = Infinity;
  for (const source of SOURCES) {
    const page = await readSince(source, sinceMs);
    readTime = Math.min(readTime, page.readTime);
    for (const doc of page.docs) found.push({ source, doc });
  }

  // Not dealt with in this process: ask pushLog (an earlier run may have pushed them).
  const open = found.filter(({ source, doc }) => !handled.has(keyOf(source, doc)) && !inflight.has(keyOf(source, doc)));
  const logs = open.length ? await db.getAll(...open.map(({ source, doc }) => logRef(keyOf(source, doc)))) : [];
  const missed = [];
  open.forEach((item, index) => {
    if (logs[index].exists) settle(keyOf(item.source, item.doc));
    else missed.push(item);
  });
  // Re-check after the awaits: a listener may have taken some meanwhile.
  const todo = missed.filter(({ source, doc }) => !handled.has(keyOf(source, doc)) && !inflight.has(keyOf(source, doc)));

  if (todo.length > CATCH_UP_SINGLES || todo.some(({ source, doc }) => burstSkipped.has(keyOf(source, doc)))) {
    await summarise(todo);
  } else {
    await Promise.all(todo.map(({ source, doc }) => handle(source, doc)));
  }

  const listenerMissed = todo.some(({ source, doc }) => {
    const key = keyOf(source, doc);
    const created = createdMs(doc);
    return !burstSkipped.has(key) && !rounds.has(key) && created > listeningSince + 5000 && Date.now() - created > MISSED_AFTER_MS;
  });
  if (listenerMissed) scheduleRelisten("the check found an enquiry the listeners missed");

  // Move the cursor up to the read time, but never past an enquiry that still waits for a retry or
  // a push in flight; a restart or the next check takes those again.
  let next = readTime;
  for (const { source, doc } of found) {
    const key = keyOf(source, doc);
    if (!handled.has(key)) next = Math.min(next, createdMs(doc) - 1);
  }
  if (Number.isFinite(next) && next > cursorMs) {
    cursorMs = next;
    writeState();
  }
}

/** One check at a time; callers share the running one. */
function check() {
  if (!checking) {
    checking = runCheck()
      .catch((error) => log("warn", "Check failed; the next one tries again from the same point", { error: errorText(error) }))
      .finally(() => {
        checking = null;
      });
  }
  return checking;
}

/* ------------------------------------------------------------------ tests */

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

/* ------------------------------------------------------------------ listeners */

let unsubscribers = [];
let relistenTimer = null;
let stopping = false;

function stopListening() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
  listeningSince = Infinity;
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
  listeningSince = Date.now();
  const since = Timestamp.fromMillis(listeningSince - FRESH_MS);
  for (const source of SOURCES) {
    unsubscribers.push(
      db
        .collection(source.collection)
        .where("createdAt", ">", since)
        .orderBy("createdAt")
        .onSnapshot(
          (snapshot) => {
            for (const change of snapshot.docChanges()) if (change.type === "added") handleLive(source, change.doc);
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

/* ------------------------------------------------------------------ upkeep */

async function heartbeat() {
  await db.collection("pushServer").doc("status").set(
    {
      lastSeen: FieldValue.serverTimestamp(),
      startedAt: Timestamp.fromMillis(startedAt),
      version: VERSION,
      label: LABEL,
    },
    { merge: true },
  );
}

async function cleanup() {
  // The check never looks back further than CATCH_UP_MAX_MS, so older in-memory keys can go.
  const keepAfter = Date.now() - 2 * CATCH_UP_MAX_MS;
  for (const [key, at] of handled) if (at < keepAfter) handled.delete(key);
  // Retry counts and burst marks of enquiries that have left the window (normally empty).
  for (const key of [...rounds.keys(), ...burstSkipped]) {
    if (!inflight.has(key) && !checking) {
      rounds.delete(key);
      burstSkipped.delete(key);
    }
  }
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
  await Promise.race([Promise.allSettled([...inflight.values(), checking]), sleep(10_000)]);
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
log("info", "Push server running", { version: VERSION, cursor: new Date(cursorMs).toISOString() });
writeState();
listen();
every(CHECK_MS, check, "Check");
every(RELISTEN_MS, listen, "Relisten");
every(HEARTBEAT_MS, heartbeat, "Heartbeat");
every(STATE_MS, writeState, "State");
every(CLEANUP_MS, cleanup, "Clean-up");
void check();
