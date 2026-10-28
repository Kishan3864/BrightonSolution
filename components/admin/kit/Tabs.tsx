"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { Badge } from "./Pills";
import { cx } from "./cx";

/**
 * Tabs: an underlined row that scrolls sideways when it does not fit. The active tab is scrolled
 * just into view (never flush left, so the tabs before it stay visible), and soft edge fades show on
 * the side(s) that have more tabs.
 * With `hrefFor` the tabs are links (route-driven, aria-current="page"); otherwise buttons with
 * aria-pressed that call onChange. Segmented: a compact pill switch for 2-5 options (ranges, modes).
 */

export type TabItem<K extends string> = { key: K; label: string; icon?: AdminIconName; count?: number };

export function Tabs<K extends string>({
  items,
  value,
  onChange,
  hrefFor,
  ariaLabel,
  className,
}: {
  items: readonly TabItem<K>[];
  value: K;
  onChange?: (key: K) => void;
  /** Make each tab a link (e.g. key => "#/analytics/" + key). */
  hrefFor?: (key: K) => string;
  ariaLabel: string;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((current) => (current.left === left && current.right === right ? current : { left, right }));
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  // Scroll only as far as needed to show the active tab, with a margin past the fade.
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>("[data-active='true']");
    if (!el || !box) return;
    const margin = 32;
    const start = el.offsetLeft - box.offsetLeft;
    const end = start + el.offsetWidth;
    let target: number | null = null;
    if (start - margin < box.scrollLeft) target = Math.max(0, start - margin);
    else if (end + margin > box.scrollLeft + box.clientWidth) target = end + margin - box.clientWidth;
    if (target === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
  }, [value]);

  const fade =
    edges.left && edges.right
      ? "[mask-image:linear-gradient(to_right,transparent,#000_28px,#000_calc(100%-28px),transparent)]"
      : edges.left
        ? "[mask-image:linear-gradient(to_right,transparent,#000_28px)]"
        : edges.right
          ? "[mask-image:linear-gradient(to_left,transparent,#000_28px)]"
          : "";

  return (
    <nav aria-label={ariaLabel} className={cx("relative min-w-0 border-b border-line", className)}>
      <div
        ref={scroller}
        onScroll={measure}
        className={cx("-mb-px flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", fade)}
      >
        {items.map((item) => {
          const active = item.key === value;
          const inner: ReactNode = (
            <>
              {item.icon ? <AdminIcon name={item.icon} size={16} className={active ? "text-accent" : ""} /> : null}
              <span>{item.label}</span>
              {item.count ? <Badge count={item.count} tone={active ? "accent" : "muted"} /> : null}
            </>
          );
          const cls = cx(
            "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[0.875rem] font-medium transition-colors focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
            active ? "border-accent text-fg" : "border-transparent text-muted hover:border-line-strong hover:text-fg",
          );
          return hrefFor ? (
            <a
              key={item.key}
              href={hrefFor(item.key)}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className={cls}
              onClick={() => onChange?.(item.key)}
            >
              {inner}
            </a>
          ) : (
            <button key={item.key} type="button" data-active={active} aria-pressed={active} className={cls} onClick={() => onChange?.(item.key)}>
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type SegmentOption<V extends string> = { value: V; label: string; title?: string };

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  block = false,
  className,
}: {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  /** Stretch the options to fill the width. */
  block?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx("inline-flex min-w-0 items-center gap-0.5 rounded-sharp border border-line bg-canvas/70 p-0.5", block && "flex w-full", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center justify-center whitespace-nowrap rounded-[0.55rem] font-medium tabular-nums transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent",
              size === "sm" ? "min-h-7 px-2.5 text-[0.75rem] pointer-coarse:min-h-10" : "min-h-8 px-3 text-[0.8125rem] pointer-coarse:min-h-10",
              block && "flex-1",
              active ? "bg-surface-2 text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
