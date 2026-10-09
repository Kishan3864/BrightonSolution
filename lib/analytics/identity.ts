/**
 * Anonymous, cookieless identifiers for first-party analytics.
 *
 * - visitorId  random id in localStorage "bs_vid" (no personal data; cleared with site data).
 * - sessionId  random id in sessionStorage "bs_sid" (per tab); a new session starts after
 *              30 minutes without activity. The session record also carries the running
 *              page counter (pageIndex), the event budget and whether the visitor was new
 *              when the session began.
 * When storage is blocked everything falls back to in-memory values for the current page load.
 */

import { ID_PATTERN } from "@/lib/firebase/schema";
import { randomId } from "@/lib/firebase/firestore";

export const VISITOR_KEY = "bs_vid";
export const SESSION_KEY = "bs_sid";
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const MAX_EVENTS_PER_SESSION = 60;

export type SessionState = {
  id: string;
  /** Epoch ms of the last activity. */
  last: number;
  /** Page views started in this session (the last pageIndex handed out). */
  pages: number;
  /** Events written in this session. */
  events: number;
  /** The visitor id did not exist before this session started. */
  newVisitor: boolean;
};

let memoryVisitor: string | null = null;
let memoryVisitorIsNew = false;
let memorySession: SessionState | null = null;

function readVisitor(): { id: string; isNew: boolean } {
  try {
    const stored = window.localStorage.getItem(VISITOR_KEY);
    if (stored && ID_PATTERN.test(stored)) return { id: stored, isNew: false };
    const id = randomId(20);
    window.localStorage.setItem(VISITOR_KEY, id);
    return { id, isNew: true };
  } catch {
    if (!memoryVisitor) {
      memoryVisitor = randomId(20);
      memoryVisitorIsNew = true;
    }
    return { id: memoryVisitor, isNew: memoryVisitorIsNew };
  }
}

export function getVisitorId(): string {
  return readVisitor().id;
}

function parseSession(raw: string | null): SessionState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SessionState>;
    if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) return null;
    return {
      id: value.id,
      last: Number(value.last) || 0,
      pages: Math.max(0, Math.floor(Number(value.pages) || 0)),
      events: Math.max(0, Math.floor(Number(value.events) || 0)),
      newVisitor: value.newVisitor === true,
    };
  } catch {
    return null;
  }
}

function loadSession(): SessionState | null {
  try {
    return parseSession(window.sessionStorage.getItem(SESSION_KEY));
  } catch {
    return memorySession;
  }
}

function storeSession(session: SessionState): void {
  memorySession = session;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* memory only */
  }
}

/** Current session, rotating it after 30 minutes of inactivity. Also marks activity. */
export function getSession(now = Date.now()): SessionState {
  const visitor = readVisitor();
  const existing = loadSession();
  if (existing && now - existing.last <= SESSION_IDLE_MS) {
    const next = { ...existing, last: now };
    storeSession(next);
    return next;
  }
  const fresh: SessionState = { id: randomId(20), last: now, pages: 0, events: 0, newVisitor: visitor.isNew };
  storeSession(fresh);
  return fresh;
}

/** True when the stored session would be rotated at `now` (used after long hidden periods). */
export function sessionExpired(now = Date.now()): boolean {
  const existing = loadSession();
  return !existing || now - existing.last > SESSION_IDLE_MS;
}

/** Marks activity without creating anything new. */
export function touchSession(now = Date.now()): void {
  const existing = loadSession();
  if (existing && now - existing.last <= SESSION_IDLE_MS) storeSession({ ...existing, last: now });
}

/** Starts a page view in the current session and returns its 1-based index. */
export function nextPageIndex(): { session: SessionState; pageIndex: number } {
  const session = getSession();
  const pages = Math.min(1000, session.pages + 1);
  const next = { ...session, pages };
  storeSession(next);
  return { session: next, pageIndex: pages };
}

/** Consumes one unit of the per-session event budget; false when exhausted. */
export function takeEventBudget(): SessionState | null {
  const session = getSession();
  if (session.events >= MAX_EVENTS_PER_SESSION) return null;
  const next = { ...session, events: session.events + 1 };
  storeSession(next);
  return next;
}
