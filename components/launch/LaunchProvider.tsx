"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Currency } from "@/lib/content/launch";
import { defaultCurrency } from "@/lib/launch/lead";

/** What a plan request hands to the brief form when the visitor chooses to add details. */
export type BriefPrefill = { plan?: string; name?: string; email?: string; phone?: string };

type LaunchState = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  prefill: (BriefPrefill & { nonce: number }) | null;
  /** Fills the brief form with what is already known and scrolls to it. */
  openBrief: (prefill?: BriefPrefill) => void;
};

const CURRENCY_KEY = "bs_currency";

const LaunchContext = createContext<LaunchState | null>(null);

export function useLaunch(): LaunchState {
  const value = useContext(LaunchContext);
  if (!value) throw new Error("useLaunch must be used inside LaunchProvider");
  return value;
}

export function scrollToBrief() {
  const target = document.getElementById("brief");
  if (!target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/**
 * Page-wide state for the landing page: the currency prices and budgets are shown in (rupees for
 * Indian time zones, US dollars elsewhere, remembered once the visitor switches) and the hand-off
 * from a plan request to the full brief form.
 */
export default function LaunchProvider({ children }: { children: ReactNode }) {
  // Static HTML always renders dollars; the visitor's currency is applied after hydration.
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [prefill, setPrefill] = useState<LaunchState["prefill"]>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(CURRENCY_KEY);
    } catch {
      /* storage blocked: fall back to the time zone */
    }
    setCurrencyState(stored === "USD" || stored === "INR" ? stored : defaultCurrency());
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      /* the choice lasts for this page load only */
    }
  }, []);

  const openBrief = useCallback((next?: BriefPrefill) => {
    if (next) setPrefill({ ...next, nonce: Date.now() });
    window.requestAnimationFrame(scrollToBrief);
  }, []);

  const value = useMemo(() => ({ currency, setCurrency, prefill, openBrief }), [currency, setCurrency, prefill, openBrief]);

  return <LaunchContext.Provider value={value}>{children}</LaunchContext.Provider>;
}

/** Two-option switch between US dollars and rupees. */
export function CurrencySwitch({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useLaunch();
  const options: { id: Currency; label: string }[] = [
    { id: "USD", label: "USD $" },
    { id: "INR", label: "INR ₹" },
  ];
  return (
    <div
      role="group"
      aria-label="Show prices in"
      className={`inline-flex rounded-full border border-line-strong bg-surface p-1 ${className}`.trim()}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={currency === option.id}
          onClick={() => setCurrency(option.id)}
          className={`inline-flex min-h-[36px] items-center rounded-full px-3.5 font-mono text-[0.75rem] tracking-[0.04em] transition-colors duration-200 ${
            currency === option.id ? "bg-fg text-canvas" : "text-muted hover:text-fg"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
