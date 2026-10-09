"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production over HTTPS only (never on localhost).
 * Every failure is swallowed: the site must behave identically without it.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    try {
      if (!("serviceWorker" in navigator)) return;
      const { protocol, hostname } = window.location;
      if (protocol !== "https:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
        return;
      }

      const register = () => {
        try {
          navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
            /* ignore: the site works without a service worker */
          });
        } catch {
          /* ignore */
        }
      };

      if (document.readyState === "complete") {
        register();
        return;
      }
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
