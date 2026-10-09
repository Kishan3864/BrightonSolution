"use client";

import type { MouseEvent } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Reloads the current address. Rendered as <a href=""> so it also works before
 * (or without) hydration, e.g. when the offline page is served from the cache.
 */
export default function RetryButton({ label = "Retry" }: { label?: string }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    try {
      window.location.reload();
    } catch {
      window.location.assign(window.location.href);
    }
  }

  return (
    <a
      href=""
      onClick={onClick}
      className="group inline-flex min-h-[44px] items-center justify-center gap-3 whitespace-nowrap rounded-sharp bg-ink px-6 py-2.5 text-[0.9375rem] font-semibold tracking-tight text-paper transition-colors duration-200 hover:bg-accent"
    >
      <span>{label}</span>
      <Icon name="arrow" size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </a>
  );
}
