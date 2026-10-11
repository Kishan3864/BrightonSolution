/**
 * User-agent parsing for the /admin reports (contact submissions store the raw user agent; page
 * views already carry browser, OS and device from the tracker). Pure and dependency-free.
 *
 * Exports
 * - parseUserAgent(ua?) -> { browser, browserVersion, os, osVersion, device }
 *     browser / os: the same families the tracker records (lib/analytics/client.ts).
 *     browserVersion: major version ("141"), osVersion: "11" for Android, "18.6" for iOS/iPadOS,
 *     "10/11" for Windows NT 10 (the UA cannot tell them apart), "" when unknown.
 *     device: "mobile" | "tablet" | "desktop" from UA hints, null for an empty UA. iPads that ask for
 *     the desktop site report a Mac UA and are counted as desktop.
 */

import { parseBrowser, parseOS, type Browser, type OS } from "@/lib/analytics/client";
import type { DeviceType } from "@/lib/firebase/schema";

export type UserAgentInfo = {
  browser: Browser;
  browserVersion: string;
  os: OS;
  osVersion: string;
  device: DeviceType | null;
};

const BROWSER_VERSION: Record<Browser, RegExp | null> = {
  "Samsung Internet": /SamsungBrowser\/(\d+)/,
  Opera: /(?:OPR|OPT|Opera)\/(\d+)/,
  Edge: /Edg(?:e|A|iOS)?\/(\d+)/,
  Firefox: /(?:Firefox|FxiOS)\/(\d+)/,
  Chrome: /(?:Chrome|CriOS|Chromium)\/(\d+)/,
  Safari: /Version\/(\d+(?:\.\d+)?)/,
  Other: null,
};

function osVersion(ua: string, os: OS): string {
  if (os === "Android") return ua.match(/Android (\d+(?:\.\d+)?)/)?.[1] ?? "";
  if (os === "iOS") {
    const match = ua.match(/OS (\d+)_(\d+)/);
    return match ? `${match[1]}.${match[2]}` : "";
  }
  if (os === "Windows") {
    const nt = ua.match(/Windows NT (\d+\.\d+)/)?.[1];
    if (nt === "10.0") return "10/11";
    if (nt === "6.3") return "8.1";
    if (nt === "6.2") return "8";
    if (nt === "6.1") return "7";
    return nt ?? "";
  }
  if (os === "macOS") {
    const match = ua.match(/Mac OS X (\d+)[_.](\d+)/);
    return match ? `${match[1]}.${match[2]}` : "";
  }
  return "";
}

export function deviceFromUserAgent(ua: string): DeviceType | null {
  if (!ua) return null;
  if (/iPad|Tablet|PlayBook|Silk|Kindle|SM-T\d|Nexus (?:7|9|10)\b/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Windows Phone|Opera Mini|BlackBerry|IEMobile/i.test(ua)) return "mobile";
  // Android tablets leave "Mobile" out of the UA.
  if (/Android/i.test(ua)) return "tablet";
  return "desktop";
}

export function parseUserAgent(ua?: string): UserAgentInfo {
  const value = typeof ua === "string" ? ua : "";
  const browser = parseBrowser(value);
  const os = parseOS(value, 0);
  const pattern = BROWSER_VERSION[browser];
  return {
    browser,
    browserVersion: pattern ? (value.match(pattern)?.[1] ?? "") : "",
    os,
    osVersion: osVersion(value, os),
    device: deviceFromUserAgent(value),
  };
}
