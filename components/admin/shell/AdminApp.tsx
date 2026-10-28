"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider } from "../kit/Toaster";
import AdminDataProvider from "../data/AdminDataProvider";
import type { AdminSource } from "../data/types";
import OverviewView from "../views/OverviewView";
import ContactsView from "../views/contacts/ContactsView";
import LandingView from "../views/landing/LandingView";
import AnalyticsView from "../views/analytics/AnalyticsView";
import SettingsView from "../views/SettingsView";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { navigate, useHashRoute, type Route } from "./router";
import { syncPush } from "../data/push";

/**
 * The signed-in admin app: toasts + data provider + a full-height shell (100dvh, no page scroll).
 * Layout: sidebar (md+) | [top bar / scrolling content]; phones get the bottom tab bar instead.
 * Only the content region scrolls; it returns to the top when the section or analytics tab changes
 * (not when a detail drawer opens, so the list keeps its place). The root layout's <main> already
 * wraps the whole app, so the content area is a labelled region (one main landmark), and the app has
 * its own skip link that focuses it without touching the hash route.
 */

const SIDEBAR_KEY = "bs_admin_sidebar";

export default function AdminApp({
  source,
  email,
  onExpired,
  onSignOut,
}: {
  source: AdminSource;
  email: string;
  onExpired: () => void;
  onSignOut: () => void;
}) {
  return (
    <ToastProvider>
      <AdminDataProvider source={source} email={email} onExpired={onExpired} onSignOut={onSignOut}>
        <Shell />
      </AdminDataProvider>
    </ToastProvider>
  );
}

function Shell() {
  const route = useHashRoute();
  const main = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* storage blocked: expanded */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(SIDEBAR_KEY, value ? "0" : "1");
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      return !value;
    });
  }, []);

  const section = route.view === "analytics" ? `analytics/${route.tab}` : route.view;
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [section]);

  // A tapped push alert (admin-site/sw.js) asks the open app to show that enquiry. On start, this
  // device's push subscription is re-saved in case the browser replaced it.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    void syncPush();
    const onMessage = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (!data || typeof data !== "object") return;
      const { type, url } = data as { type?: unknown; url?: unknown };
      if (type === "bs-admin-open" && typeof url === "string") navigate(url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  return (
    <div id="admin-app" className="fixed inset-0 flex h-[100dvh] min-w-[320px] overflow-hidden bg-canvas text-fg">
      <a
        href="#admin-main"
        onClick={(event) => {
          // Focus only: the hash is the app's router.
          event.preventDefault();
          main.current?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(1rem+env(safe-area-inset-top))] focus:z-[120] focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-sharp focus:bg-fg focus:px-5 focus:text-[0.9375rem] focus:text-canvas"
      >
        Skip to content
      </a>
      <Sidebar route={route} collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar route={route} />
        <div
          ref={main}
          id="admin-main"
          role="region"
          aria-label="Content"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] focus:outline-none [scrollbar-gutter:stable] md:pl-0"
        >
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 md:pb-12 lg:px-8 lg:pt-7">
            <RouteView route={route} />
          </div>
        </div>
      </div>
      <BottomNav route={route} />
    </div>
  );
}

function RouteView({ route }: { route: Route }) {
  switch (route.view) {
    case "overview":
      return <OverviewView />;
    case "contacts":
      return <ContactsView selectedId={route.id ?? null} />;
    case "landing":
      return <LandingView selectedId={route.id ?? null} />;
    case "analytics":
      return <AnalyticsView tab={route.tab} sessionId={route.sessionId ?? null} visitorId={route.visitorId ?? null} />;
    case "settings":
      return <SettingsView />;
  }
}
