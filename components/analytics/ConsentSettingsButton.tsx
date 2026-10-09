"use client";

import { CONSENT_RESET_EVENT } from "@/lib/analytics/gtag";

/** Reopens the Google Analytics consent bar so a visitor can change or withdraw their choice. */
export default function ConsentSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_RESET_EVENT))}
      className={className}
    >
      Analytics settings
    </button>
  );
}
