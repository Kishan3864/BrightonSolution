"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyInternalParam } from "@/lib/analytics/env";
import { install, route, uninstall } from "@/lib/analytics/tracker";

/**
 * First-party, cookieless analytics (page views with time on page, scroll depth and click events)
 * written straight to Firestore. Renders nothing. All rules live in lib/analytics/tracker.ts;
 * disabled on localhost, with Global Privacy Control, for bots, on /admin and when
 * NEXT_PUBLIC_ANALYTICS_DISABLED=true.
 *
 * Only usePathname is used (no useSearchParams), so the static export needs no Suspense boundary;
 * UTM parameters are read from window.location inside the tracker.
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Before the first page view is recorded: ?bs_internal=on marks this browser as the team's own.
    applyInternalParam();
    install();
    return () => uninstall();
  }, []);

  useEffect(() => {
    route(pathname || "/");
  }, [pathname]);

  return null;
}
