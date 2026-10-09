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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper text-ink"
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-[clamp(1rem,0.5rem+2.5vw,3rem)] py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="min-w-0 text-[0.8125rem] leading-snug text-muted">
          May we use Google Analytics to measure visits? Nothing is loaded unless you accept.{" "}
          <Link
            href="/privacy"
            className="whitespace-nowrap text-ink underline decoration-1 underline-offset-4 hover:text-accent"
          >
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="inline-flex min-h-[44px] min-w-[96px] items-center justify-center rounded-sharp border border-ink px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="inline-flex min-h-[44px] min-w-[96px] items-center justify-center rounded-sharp bg-ink px-4 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-accent"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
