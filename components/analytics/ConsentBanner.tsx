"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { firebaseConfig } from "@/lib/firebase/config";
import { analyticsAllowed, isAdminPath, prefersNoTracking } from "@/lib/analytics/env";
import {
  CONSENT_RESET_EVENT,
  gtagPageView,
  loadGtag,
  readConsent,
  revokeGtag,
  storeConsent,
  type ConsentChoice,
} from "@/lib/analytics/gtag";
import styles from "./ConsentBanner.module.css";

const measurementId = firebaseConfig.measurementId.trim();

/**
 * Minimal consent bar for the OPTIONAL Google Analytics 4 layer.
 * Renders nothing at all unless NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is set. gtag.js is loaded only
 * after "Accept"; "Decline" loads nothing. Not shown on /admin, and visitors sending Global Privacy
 * Control are treated as having declined. The first-party, cookieless analytics does not depend on it.
 */
export default function ConsentBanner() {
  const pathname = usePathname() || "/";
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [ready, setReady] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!measurementId) return;
    setChoice(prefersNoTracking() ? "denied" : readConsent());
    setReady(true);

    const reopen = () => {
      storeConsent(null);
      revokeGtag();
      lastPath.current = null;
      setChoice(prefersNoTracking() ? "denied" : null);
    };
    window.addEventListener(CONSENT_RESET_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_RESET_EVENT, reopen);
  }, []);

  // Load gtag after consent and send one page_view per route.
  useEffect(() => {
    if (!measurementId || choice !== "granted") return;
    if (isAdminPath(pathname) || !analyticsAllowed()) return;
    if (!loadGtag(measurementId)) return;
    if (lastPath.current === pathname) return;
    // Let the new route set its <title> first.
    const timer = window.setTimeout(() => {
      lastPath.current = pathname;
      gtagPageView(pathname);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [choice, pathname]);

  const decide = useCallback((value: ConsentChoice) => {
    storeConsent(value);
    if (value === "denied") revokeGtag();
    setChoice(value);
  }, []);

  if (!measurementId || !ready || choice !== null || isAdminPath(pathname)) return null;

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className={`fixed inset-x-3 bottom-3 z-40 text-fg sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[min(30rem,calc(100vw-2.5rem))] ${styles.panel}`}
    >
      <div className="rounded-[var(--radius-card)] border border-line-strong bg-surface-2 p-4 shadow-[0_24px_48px_-20px_rgba(5,6,8,0.85)] sm:p-5">
        <p className="text-[0.875rem] leading-relaxed text-muted">
          May we use Google Analytics to measure visits? Nothing is loaded unless you accept.{" "}
          <Link
            href="/privacy"
            className="whitespace-nowrap text-fg underline decoration-1 underline-offset-4 transition-colors hover:text-accent"
          >
            Privacy policy
          </Link>
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-sharp border border-line-strong px-4 text-[0.875rem] font-medium text-fg transition-colors duration-200 hover:border-fg hover:bg-fg/5 sm:flex-none sm:min-w-[7rem]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-sharp bg-fg px-4 text-[0.875rem] font-medium text-canvas transition-colors duration-200 hover:bg-accent sm:flex-none sm:min-w-[7rem]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
