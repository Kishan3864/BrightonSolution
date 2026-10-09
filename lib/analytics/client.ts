/**
 * Coarse, non-identifying client facts for page views: device class, browser and OS family,
 * language, time zone, viewport/screen size and scroll depth.
 */

import type { DeviceType } from "@/lib/firebase/schema";

export type Browser = "Edge" | "Chrome" | "Safari" | "Firefox" | "Samsung Internet" | "Opera" | "Other";
export type OS = "Windows" | "macOS" | "iOS" | "Android" | "Linux" | "Other";

export function parseBrowser(ua: string): Browser {
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/OPR\/|Opera|OPT\//.test(ua)) return "Opera";
  if (/Edg(e|A|iOS)?\//.test(ua)) return "Edge";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  if (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua)) return "Safari";
  return "Other";
}

export function parseOS(ua: string, maxTouchPoints = 0): OS {
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  if (/Macintosh|Mac OS X/.test(ua)) return maxTouchPoints > 1 ? "iOS" : "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/CrOS/.test(ua)) return "Other";
  if (/Linux|X11/.test(ua)) return "Linux";
  return "Other";
}

export function deviceType(width: number, coarsePointer: boolean): DeviceType {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  // Large touch-only screens without hover (tablets in landscape) count as tablets.
  if (coarsePointer && width <= 1366) return "tablet";
  return "desktop";
}

function matches(query: string): boolean {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function int(value: number, max = 10_000): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function readTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

export type ClientFacts = {
  viewportW: number;
  viewportH: number;
  screenW: number;
  screenH: number;
  device: DeviceType;
  browser: Browser;
  os: OS;
  language: string;
  timeZone: string;
};

export function readClientFacts(): ClientFacts {
  const ua = navigator.userAgent || "";
  const viewportW = int(window.innerWidth || document.documentElement.clientWidth || 0);
  const viewportH = int(window.innerHeight || document.documentElement.clientHeight || 0);
  const coarse = matches("(pointer: coarse)") && !matches("(hover: hover)");
  return {
    viewportW,
    viewportH,
    screenW: int(window.screen?.width ?? 0),
    screenH: int(window.screen?.height ?? 0),
    device: deviceType(viewportW, coarse),
    browser: parseBrowser(ua),
    os: parseOS(ua, navigator.maxTouchPoints || 0),
    language: (navigator.language || "").slice(0, 35),
    timeZone: readTimeZone().slice(0, 64),
  };
}

/** Percentage of the document that has been on screen (0–100). */
export function scrollDepth(): number {
  try {
    const doc = document.documentElement;
    const height = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
    const seen = (window.scrollY || doc.scrollTop || 0) + (window.innerHeight || doc.clientHeight || 0);
    if (height <= 0) return 0;
    return int((seen / height) * 100, 100);
  } catch {
    return 0;
  }
}
