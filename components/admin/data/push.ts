"use client";

import { getValidIdToken } from "@/lib/firebase/auth";
import { deleteDocument, getDocument, setDocument } from "@/lib/firebase/firestore-admin";
import { isAdminHost } from "@/lib/analytics/env";

/**
 * Background push for the installed admin app (Web Push with VAPID; no Firebase client SDK).
 *
 * This browser subscribes with the admin site's service worker (admin-site/sw.js) and stores the
 * subscription in Firestore pushSubscriptions/{sha-256 of the endpoint} (admin-only, firestore.rules).
 * The push server on the VPS (push-server/index.js, pm2) sends every new contact and landing lead to
 * all stored subscriptions, with the wording of data/notify.ts, even while the app is closed. It
 * reports in at pushServer/status every 5 minutes (pushServerStatus below).
 *
 * Only on the admin's own site: the website's service worker (public/sw.js) has no push handler.
 */

/** Public half of the VAPID key pair; the private half is VAPID_PRIVATE_KEY in the push server's .env. */
export const VAPID_PUBLIC_KEY = "BM4gSoV2wasXy-IwufVRprEhL_8tuhF6rRlroYTu9Nsq5ReJabfukqVmdQ8GUUvJJ14p4tvGy0-_05TiwKpcPks";

export const PUSH_COLLECTION = "pushSubscriptions";
/** An admin-created document here makes the push server send a test push to every subscription. */
export const PUSH_TEST_COLLECTION = "pushTests";

/**
 * "on"           this browser receives background push
 * "off"          supported, not subscribed
 * "denied"       notifications blocked in the browser
 * "needs-install" iPhone/iPad Safari: push works only from the Home Screen app
 * "other-host"   opened outside the admin site (e.g. localhost or the website's /admin)
 * "unsupported"  no service worker / Push API
 */
export type PushState = "on" | "off" | "denied" | "needs-install" | "other-host" | "unsupported";

function isIos(): boolean {
  const ua = navigator.userAgent || "";
  // iPadOS reports itself as a Mac; touch points tell them apart.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** True when the app runs from the Home Screen / as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (!isAdminHost()) return "other-host";
  const supported = "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
  if (!supported) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    return subscription && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "off";
  }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64url}${"=".repeat((4 - (base64url.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Document id of a subscription: hex SHA-256 of its endpoint (64 characters, a valid Firestore id). */
async function subscriptionId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A short name for the device in the subscriptions list ("Android · Chrome"). */
function deviceLabel(): string {
  const ua = navigator.userAgent || "";
  const os = /Android/.test(ua) ? "Android" : isIos() ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}${isStandalone() ? " (app)" : ""}`;
}

/**
 * Asks for permission (must run from a tap), subscribes this browser and stores the subscription.
 * Resolves the new state; throws a FirestoreError when saving fails (the caller reports it).
 */
export async function enablePush(idToken: string): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  await saveSubscription(subscription, idToken);
  return "on";
}

/** Stores (or refreshes) a subscription in Firestore. */
async function saveSubscription(subscription: PushSubscription, idToken: string): Promise<void> {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";
  if (!subscription.endpoint || !p256dh || !auth) throw new Error("The browser returned an incomplete push subscription.");
  await setDocument(
    PUSH_COLLECTION,
    await subscriptionId(subscription.endpoint),
    {
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      label: deviceLabel(),
      userAgent: (navigator.userAgent || "").slice(0, 400),
    },
    idToken,
    { serverTimestamp: "updatedAt" },
  );
}

let lastSync = 0;
const SYNC_EVERY_MS = 6 * 3600 * 1000;

/**
 * Re-saves this device's subscription when the app starts (browsers may replace it; admin-site/sw.js
 * subscribes again on pushsubscriptionchange), so alerts keep reaching it. Does nothing unless push
 * is on here; failures are retried on the next start.
 */
export async function syncPush(): Promise<void> {
  try {
    if (!isAdminHost() || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    if (!subscription) return;
    const token = await getValidIdToken();
    if (token) {
      await saveSubscription(subscription, token);
      lastSync = Date.now();
    }
  } catch {
    /* retried on the next start */
  }
}

/** syncPush at most every 6 hours; for when the app comes back to the front. */
export function syncPushSoon(): void {
  if (Date.now() - lastSync >= SYNC_EVERY_MS) void syncPush();
}

/** Cache where admin-site/sw.js records the tag of every alert push showed on this device. */
const SHOWN_CACHE = "bs-push-shown";

/**
 * The tags among `tags` whose alert background push already showed on this device, so the open
 * app shows only the others (and still alerts when the push server is down). Empty when unknown.
 */
export async function shownByPush(tags: readonly string[]): Promise<Set<string>> {
  const shown = new Set<string>();
  if (typeof caches === "undefined" || !tags.length) return shown;
  try {
    const cache = await caches.open(SHOWN_CACHE);
    await Promise.all(
      tags.map(async (tag) => {
        if (await cache.match(`/__push-shown/${encodeURIComponent(tag)}`)) shown.add(tag);
      }),
    );
  } catch {
    /* storage blocked: treat as not shown */
  }
  return shown;
}

/** Unsubscribes this browser and removes its stored subscription. */
export async function disablePush(idToken: string): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const subscription = reg ? await reg.pushManager.getSubscription() : null;
  if (subscription) {
    await deleteDocument(PUSH_COLLECTION, await subscriptionId(subscription.endpoint), idToken);
    await subscription.unsubscribe();
  }
  return "off";
}

/** Asks the push server to push a sample alert to every subscribed device. */
export async function sendTestPush(idToken: string): Promise<void> {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  await setDocument(PUSH_TEST_COLLECTION, id, {}, idToken, { serverTimestamp: "createdAt" });
}

/* ------------------------------------------------------------------ push server status */

/** The push server sets lastSeen here every 5 minutes, and the outcome of each alert (admin read only). */
const PUSH_SERVER_COLLECTION = "pushServer";
const PUSH_SERVER_DOC = "status";
/** No report for this long means the push server is not running. */
export const PUSH_SERVER_STALE_MS = 12 * 60 * 1000;

export type PushServerStatus = {
  lastSeen: Date | null;
  version: string;
  label: string;
  /**
   * The last alert it sent: when, to how many devices, how many accepted it, the outcome, and the
   * error code ("403", "timeout", "network", ...) when some device did not get it.
   */
  lastPush: { at: Date; devices: number; sent: number; error: string; outcome: PushOutcome } | null;
};

/** delivered: every device; partial: some; temporary: none yet, the server retries; failed: refused; none: no device has push on. */
export type PushOutcome = "delivered" | "partial" | "temporary" | "failed" | "none";

function outcomeOf(value: unknown, devices: number, sent: number): PushOutcome {
  if (value === "delivered" || value === "partial" || value === "temporary" || value === "failed" || value === "none") return value;
  // Reports written before lastPushOutcome existed.
  return devices === 0 ? "none" : sent === 0 ? "failed" : sent < devices ? "partial" : "delivered";
}

/** The push server's last report, or null when it has never run. Throws a FirestoreError. */
export async function pushServerStatus(idToken: string): Promise<PushServerStatus | null> {
  const doc = await getDocument<Record<string, unknown>>(PUSH_SERVER_COLLECTION, PUSH_SERVER_DOC, idToken);
  if (!doc) return null;
  const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  return {
    lastSeen: doc.lastSeen instanceof Date ? doc.lastSeen : null,
    version: typeof doc.version === "string" ? doc.version : "",
    label: typeof doc.label === "string" ? doc.label : "",
    lastPush:
      doc.lastPushAt instanceof Date
        ? {
            at: doc.lastPushAt,
            devices: count(doc.lastPushDevices),
            sent: count(doc.lastPushSent),
            error: typeof doc.lastPushError === "string" ? doc.lastPushError : "",
            outcome: outcomeOf(doc.lastPushOutcome, count(doc.lastPushDevices), count(doc.lastPushSent)),
          }
        : null,
  };
}

/* ------------------------------------------------------------------ install prompt */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredInstall: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

/**
 * Keeps Chrome's install prompt (beforeinstallprompt) so Settings can offer an "Install app"
 * button. Called once by the app shell on mount; returns the clean-up.
 */
export function captureInstallPrompt(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferredInstall = event as InstallPromptEvent;
    installListeners.forEach((fn) => fn());
  };
  const onInstalled = () => {
    deferredInstall = null;
    installListeners.forEach((fn) => fn());
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function canInstall(): boolean {
  return deferredInstall !== null;
}

export function subscribeInstall(fn: () => void): () => void {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}

/** Shows the browser's install dialog; resolves true when the app was installed. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredInstall;
  if (!event) return false;
  deferredInstall = null;
  installListeners.forEach((fn) => fn());
  await event.prompt();
  const choice = await event.userChoice;
  return choice.outcome === "accepted";
}
