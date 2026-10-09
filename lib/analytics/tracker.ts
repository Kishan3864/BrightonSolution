/**
 * First-party, cookieless page-view and event tracker (browser only, framework-free).
 *
 * Page views
 * - One page view starts when a route is shown (route(path)). Time on page counts only while
 *   the tab is visible; max scroll depth is kept.
 * - The record is written ("pageviews", keepalive) the first time the visitor leaves it:
 *   route change, tab hidden, pagehide/beforeunload. Mobile browsers may kill a hidden tab,
 *   so the hide is the last reliable moment to send.
 * - Returning to a hidden tab:
 *     - within the 30-minute session window: a continuation segment of the SAME page view
 *       (same sessionId + pageIndex, no referrer/UTM). It is written on the next leave only if it
 *       adds at least 1 s of visible time. The dashboard merges segments by sessionId + pageIndex,
 *       so each page view is counted once and its time is the sum of its segments.
 *     - after the window: a new session and a new page view of the same path.
 * - Visible time under 300 ms is stored as 0 (prefetch/bot noise) but the view still counts;
 *   time is capped at 6 h.
 *
 * Events ("events", keepalive, max 60 per session)
 * - Clicks on [data-track] elements (type = data-track if it is a known EventType, else derived
 *   from the link or cta_click; label = data-track-label, aria-label or text).
 * - Clicks on links without data-track: mailto: -> mailto, tel: -> tel, play.google.com -> play,
 *   other external http(s) -> outbound. Query strings are always stripped from hrefs.
 * - window CustomEvent "bs:track" (TrackDetail) from UI components, e.g. the contact form's
 *   form_submit (label "contact:ok" / "contact:failed"). Form contents are never read.
 *
 * Every failure is silent; analytics can never break the page.
 */

import { createDocument } from "@/lib/firebase/firestore";
import {
  COLLECTIONS,
  EVENT_LIMITS,
  EVENT_TYPES,
  PAGEVIEW_LIMITS,
  clip,
  cleanUrl,
  retentionExpiry,
  type EventRecord,
  type EventType,
  type PageviewRecord,
  type TrackDetail,
} from "@/lib/firebase/schema";
import { readClientFacts, scrollDepth, type ClientFacts } from "@/lib/analytics/client";
import { analyticsAllowed, shouldTrack } from "@/lib/analytics/env";
import { getVisitorId, nextPageIndex, sessionExpired, takeEventBudget, touchSession } from "@/lib/analytics/identity";

const MIN_VISIBLE_MS = 300;
const MIN_CONTINUATION_MS = 1000;
const MAX_DURATION_MS = 21_600_000;
const ACTIVITY_THROTTLE_MS = 15_000;
const TITLE_SETTLE_MS = 400;

type PageView = {
  path: string;
  title: string;
  visitorId: string;
  sessionId: string;
  pageIndex: number;
  isNewVisitor: boolean;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  facts: ClientFacts;
  /** Visible milliseconds accumulated in this segment. */
  visibleMs: number;
  /** performance.now() when the current visible stretch began; null while hidden. */
  visibleSince: number | null;
  maxScroll: number;
  /** 0 for the original page view, 1+ for continuation segments. */
  segment: number;
  flushed: boolean;
};

let installed = false;
/** A page view already started in this document (document.referrer and UTM describe only the first). */
let documentHadView = false;
let current: PageView | null = null;
let lastActivity = 0;
let scrollFrame = 0;
let titleTimer: ReturnType<typeof setTimeout> | null = null;
let lastClick: { el: Element | null; at: number } = { el: null, at: 0 };

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function isVisible(): boolean {
  try {
    return document.visibilityState !== "hidden";
  } catch {
    return true;
  }
}

function currentPath(): string {
  try {
    return clip(window.location.pathname || "/", PAGEVIEW_LIMITS.path) || "/";
  } catch {
    return "/";
  }
}

/** External referrer without query/hash; "" for same-site or none. */
function externalReferrer(): string {
  try {
    const ref = document.referrer;
    if (!ref) return "";
    const url = new URL(ref);
    if (url.host === window.location.host) return "";
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return cleanUrl(ref, PAGEVIEW_LIMITS.referrer);
  } catch {
    return "";
  }
}

function readUtm(): { utmSource: string; utmMedium: string; utmCampaign: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: clip(params.get("utm_source") ?? "", PAGEVIEW_LIMITS.utmSource),
      utmMedium: clip(params.get("utm_medium") ?? "", PAGEVIEW_LIMITS.utmMedium),
      utmCampaign: clip(params.get("utm_campaign") ?? "", PAGEVIEW_LIMITS.utmCampaign),
    };
  } catch {
    return { utmSource: "", utmMedium: "", utmCampaign: "" };
  }
}

function readTitle(): string {
  try {
    return clip(document.title, PAGEVIEW_LIMITS.title);
  } catch {
    return "";
  }
}

function markActivity(force = false): void {
  const t = Date.now();
  if (!force && t - lastActivity < ACTIVITY_THROTTLE_MS) return;
  lastActivity = t;
  touchSession(t);
}

/* ------------------------------------------------------------ page views */

function startPageView(path: string, options: { allowReferrer: boolean }): void {
  try {
    const { session, pageIndex } = nextPageIndex();
    const landing = pageIndex === 1 && options.allowReferrer;
    const utm = landing ? readUtm() : { utmSource: "", utmMedium: "", utmCampaign: "" };
    const view: PageView = {
      path,
      title: readTitle(),
      visitorId: getVisitorId(),
      sessionId: session.id,
      pageIndex,
      isNewVisitor: session.newVisitor,
      referrer: landing ? externalReferrer() : "",
      ...utm,
      facts: readClientFacts(),
      visibleMs: 0,
      visibleSince: isVisible() ? now() : null,
      maxScroll: 0,
      segment: 0,
      flushed: false,
    };
    current = view;
    lastActivity = Date.now();

    // The new route renders its <title> and content around this effect; read both once settled.
    if (titleTimer) clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
      titleTimer = null;
      if (current !== view) return;
      const title = readTitle();
      if (title) view.title = title;
      view.maxScroll = Math.max(view.maxScroll, scrollDepth());
    }, TITLE_SETTLE_MS);
  } catch {
    current = null;
  }
}

function pauseVisibleTime(view: PageView): void {
  if (view.visibleSince !== null) {
    view.visibleMs += Math.max(0, now() - view.visibleSince);
    view.visibleSince = null;
  }
}

function flush(): void {
  const view = current;
  if (!view || view.flushed) return;
  view.flushed = true;
  try {
    pauseVisibleTime(view);
    view.maxScroll = Math.max(view.maxScroll, scrollDepth());
    const visible = Math.round(view.visibleMs);
    if (view.segment > 0 && visible < MIN_CONTINUATION_MS) return;
    const durationMs = visible < MIN_VISIBLE_MS ? 0 : Math.min(MAX_DURATION_MS, visible);

    const record: PageviewRecord = {
      visitorId: view.visitorId,
      sessionId: view.sessionId,
      path: view.path,
      durationMs,
      scrollDepth: Math.max(0, Math.min(100, Math.round(view.maxScroll))),
      pageIndex: Math.max(0, Math.min(1000, Math.round(view.pageIndex))),
      isNewVisitor: view.isNewVisitor,
      ...view.facts,
      expireAt: retentionExpiry(),
    };
    if (view.title) record.title = view.title;
    if (view.referrer) record.referrer = view.referrer;
    if (view.utmSource) record.utmSource = view.utmSource;
    if (view.utmMedium) record.utmMedium = view.utmMedium;
    if (view.utmCampaign) record.utmCampaign = view.utmCampaign;

    void createDocument(COLLECTIONS.pageviews, record, { keepalive: true });
  } catch {
    /* silent */
  }
}

function resumeAfterHide(): void {
  const view = current;
  if (!view) return;
  if (!view.flushed) {
    if (view.visibleSince === null) view.visibleSince = now();
    markActivity(true);
    return;
  }
  if (sessionExpired()) {
    // Away longer than the session window: a fresh session and page view, without the old referrer.
    startPageView(view.path, { allowReferrer: false });
    return;
  }
  markActivity(true);
  current = {
    ...view,
    referrer: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    visibleMs: 0,
    visibleSince: now(),
    segment: view.segment + 1,
    flushed: false,
  };
}

/* ----------------------------------------------------------------- events */

function isEventType(value: string | null | undefined): value is EventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}

/** Strips query/hash; mailto/tel keep only the address/number. */
function safeHref(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) {
    return clip(trimmed.split(/[?#]/)[0] ?? "", EVENT_LIMITS.href);
  }
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("blob:")) return "";
  try {
    const url = new URL(trimmed, window.location.href);
    if (url.origin === window.location.origin) return clip(url.pathname, EVENT_LIMITS.href);
    return cleanUrl(url.href, EVENT_LIMITS.href);
  } catch {
    return clip(trimmed.split(/[?#]/)[0] ?? "", EVENT_LIMITS.href);
  }
}

function classifyLink(href: string): EventType | null {
  if (!href) return null;
  const lower = href.trim().toLowerCase();
  if (lower.startsWith("mailto:")) return "mailto";
  if (lower.startsWith("tel:")) return "tel";
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.host === window.location.host) return null;
    if (url.hostname === "play.google.com") return "play";
    return "outbound";
  } catch {
    return null;
  }
}

function labelOf(el: Element): string {
  const explicit = el.getAttribute("data-track-label") || el.getAttribute("aria-label");
  const text = explicit || (el as HTMLElement).innerText || el.textContent || "";
  return clip(text.replace(/\s+/g, " "), EVENT_LIMITS.label);
}

function sendEvent(type: EventType, label: string, href: string): void {
  try {
    if (!current) return;
    const session = takeEventBudget();
    if (!session) return;
    const record: EventRecord = {
      visitorId: getVisitorId(),
      sessionId: session.id,
      type,
      path: currentPath(),
      expireAt: retentionExpiry(),
    };
    const cleanLabel = clip(label, EVENT_LIMITS.label);
    const cleanHref = clip(href, EVENT_LIMITS.href);
    if (cleanLabel) record.label = cleanLabel;
    if (cleanHref) record.href = cleanHref;
    void createDocument(COLLECTIONS.events, record, { keepalive: true });
  } catch {
    /* silent */
  }
}

function onClick(event: MouseEvent): void {
  try {
    if (!current) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const tagged = target.closest("[data-track]");
    const anchor = target.closest("a[href]");
    const source = tagged ?? anchor;
    if (!source) return;

    // Ignore rapid repeat clicks on the same control.
    const at = Date.now();
    if (lastClick.el === source && at - lastClick.at < 1000) return;
    lastClick = { el: source, at };
    markActivity();

    const rawHref =
      anchor?.getAttribute("href") ?? tagged?.querySelector("a[href]")?.getAttribute("href") ?? "";
    if (tagged) {
      const declared = tagged.getAttribute("data-track");
      const type = isEventType(declared) ? declared : (classifyLink(rawHref) ?? "cta_click");
      sendEvent(type, labelOf(tagged), safeHref(rawHref));
      return;
    }
    const type = classifyLink(rawHref);
    if (type && anchor) sendEvent(type, labelOf(anchor), safeHref(rawHref));
  } catch {
    /* silent */
  }
}

function onTrack(event: Event): void {
  try {
    const detail = (event as CustomEvent<TrackDetail>).detail;
    if (!detail || !isEventType(detail.type)) return;
    const base = typeof detail.label === "string" ? detail.label : "";
    const label =
      typeof detail.ok === "boolean" ? `${base || detail.type}:${detail.ok ? "ok" : "failed"}` : base;
    sendEvent(detail.type, label, safeHref(typeof detail.href === "string" ? detail.href : ""));
  } catch {
    /* silent */
  }
}

/* -------------------------------------------------------------- listeners */

function onVisibilityChange(): void {
  if (!current) return;
  if (isVisible()) {
    resumeAfterHide();
  } else {
    markActivity(true);
    flush();
  }
}

function onPageHide(): void {
  flush();
}

function onPageShow(event: PageTransitionEvent): void {
  // Restored from the back/forward cache: treat like returning to the tab.
  if (event.persisted && current && isVisible()) resumeAfterHide();
}

function onScroll(): void {
  if (scrollFrame || !current) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    if (!current) return;
    current.maxScroll = Math.max(current.maxScroll, scrollDepth());
    markActivity();
  });
}

function onInput(): void {
  markActivity();
}

/** Installs the global listeners once. Returns false when analytics is disabled here. */
export function install(): boolean {
  if (installed) return true;
  if (!analyticsAllowed()) return false;
  try {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onInput, { passive: true });
    document.addEventListener("click", onClick, { capture: true, passive: true });
    window.addEventListener("bs:track", onTrack);
    installed = true;
    return true;
  } catch {
    return false;
  }
}

export function uninstall(): void {
  if (!installed) return;
  try {
    flush();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("beforeunload", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("keydown", onInput);
    document.removeEventListener("click", onClick, { capture: true });
    window.removeEventListener("bs:track", onTrack);
    if (titleTimer) clearTimeout(titleTimer);
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  } catch {
    /* silent */
  }
  scrollFrame = 0;
  titleTimer = null;
  current = null;
  installed = false;
}

/** Called on every route change (pathname only; query and hash changes are not new views). */
export function route(pathname: string): void {
  if (!installed) return;
  try {
    const path = clip(pathname || "/", PAGEVIEW_LIMITS.path) || "/";
    if (current && current.path === path) return;
    flush();
    current = null;
    if (shouldTrack(path)) {
      startPageView(path, { allowReferrer: !documentHadView });
      documentHadView = true;
    }
  } catch {
    current = null;
  }
}
