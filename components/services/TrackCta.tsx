import type { ReactNode } from "react";

/**
 * Wraps a call-to-action with data-track hooks for the first-party click
 * tracker, which resolves clicks with closest("[data-track]"). The wrapper is
 * display: contents, so it never affects layout. Shared Button does not
 * forward data-* attributes, hence the wrapper.
 */
export default function TrackCta({
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
