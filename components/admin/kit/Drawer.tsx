"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import AdminIcon from "./AdminIcon";
import { IconButton } from "./Button";
import { cx } from "./cx";

/**
 * Detail panel. Desktop (md+): a right-hand panel over a dimmed backdrop. Phones: a full-screen sheet
 * with a Back button, safe-area padding and its own scroll. A modal dialog: Escape closes, Tab stays
 * inside, focus moves in on open and returns to the opener on close, the app behind is inert.
 * The panel keeps clear of notches and the home indicator (landscape phones get the md+ layout), and
 * publishes its size (useOpenDrawerSize) so the toast stack can move out of its way.
 */

const ANIM_MS = 220;

/* Size of the open drawer, if any (one at a time), for the toast stack. */
type DrawerSize = "md" | "lg";
let openSize: DrawerSize | null = null;
const listeners = new Set<() => void>();
function setOpenSize(size: DrawerSize | null) {
  openSize = size;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The size of the drawer that is open now, or null. */
export function useOpenDrawerSize(): DrawerSize | null {
  return useSyncExternalStore(
    subscribe,
    () => openSize,
    () => null,
  );
}

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  size = "md",
  backLabel = "Back",
}: {
  open: boolean;
  /** Called by Escape, the backdrop, the close and back buttons. Usually navigates to the list route. */
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Icon buttons in the header, left of the close button. */
  headerActions?: ReactNode;
  /** Sticky action bar at the bottom (status buttons, save). */
  footer?: ReactNode;
  children: ReactNode;
  /** md = 520px, lg = 640px wide on desktop. */
  size?: "md" | "lg";
  /** Label of the phone back button. */
  backLabel?: string;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Mount, then flip `shown` on the next frame so the transition runs; unmount after the exit.
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setShown(true)));
      return () => window.cancelAnimationFrame(id);
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Focus in, trap, Escape, inert background, restore focus.
  useEffect(() => {
    if (!mounted || !open) return;
    const app = document.getElementById("admin-app");
    app?.setAttribute("inert", "");
    setOpenSize(size);
    const focusFirst = window.setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
      el?.focus({ preventScroll: true });
    }, 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener("keydown", onKey);
      app?.removeAttribute("inert");
      setOpenSize(null);
      const back = opener.current;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, [mounted, open, size]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cx("absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "absolute inset-0 flex flex-col bg-canvas outline-none transition-transform duration-200 ease-out md:bottom-[max(0.5rem,env(safe-area-inset-bottom))] md:left-auto md:right-[max(0.5rem,env(safe-area-inset-right))] md:top-[max(0.5rem,env(safe-area-inset-top))] md:rounded-[var(--radius-card)] md:border md:border-line-strong md:bg-surface md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]",
          size === "lg"
            ? "md:w-[min(640px,calc(100vw-1rem-env(safe-area-inset-left)-env(safe-area-inset-right)))]"
            : "md:w-[min(520px,calc(100vw-1rem-env(safe-area-inset-left)-env(safe-area-inset-right)))]",
          shown ? "translate-x-0" : "translate-x-full md:translate-x-[calc(100%+1rem)]",
        )}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:px-4 md:py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-1 rounded-sharp pl-1 pr-2 text-[0.9375rem] font-medium text-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent md:hidden"
          >
            <AdminIcon name="chevronLeft" size={22} />
            {backLabel}
          </button>
          <div className="hidden min-w-0 flex-1 md:block">
            <h2 id={titleId} className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-fg">
              {title}
            </h2>
            {subtitle ? <p className="truncate text-[0.8125rem] text-muted">{subtitle}</p> : null}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {headerActions}
            {/* Wrapper: "hidden" on the button itself would lose to its inline-flex. */}
            <span className="hidden md:block">
              <IconButton icon="close" label="Close" onClick={onClose} />
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Phone title sits in the scrolling content, like a large title in a native app. */}
          <div className="px-4 pt-4 md:hidden">
            <p aria-hidden="true" className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-fg [overflow-wrap:anywhere]">
              {title}
            </p>
            {subtitle ? <p className="mt-0.5 text-[0.875rem] text-muted">{subtitle}</p> : null}
          </div>
          <div className={cx("px-4 py-4 md:px-5 md:py-5", !footer && "pb-[calc(1.5rem+env(safe-area-inset-bottom))]")}>{children}</div>
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-canvas/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:rounded-b-[var(--radius-card)] md:bg-surface md:px-5 md:pb-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
