import type { ReactNode } from "react";

/**
 * Layout-neutral wrapper (display: contents) that tags a CTA for the
 * first-party click tracker, which resolves clicks with closest("[data-track]").
 */
export default function Track({
  label,
  event = "cta_click",
  children,
}: {
  label: string;
  event?: string;
  children: ReactNode;
}) {
  return (
    <span className="contents" data-track={event} data-track-label={label}>
      {children}
    </span>
  );
}
