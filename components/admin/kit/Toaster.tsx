"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { useOpenDrawerSize } from "./Drawer";
import { cx, surface } from "./cx";

/**
 * In-app toasts. Wrap the app in <ToastProvider>; call useToast().toast({...}) anywhere below it.
 * Phones: stacked above the bottom tab bar. Desktop: bottom-right, clear of the safe-area insets;
 * while a detail drawer is open the stack moves left of it when there is room, else above its action
 * footer, so it never hides the drawer's buttons. One polite live region announces them; error toasts
 * use role="alert". New-enquiry toasts ("lead" / "contact") stay until dismissed or opened, others
 * fade after `duration`.
 */

const VIEWPORT_DESKTOP = {
  none: "md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))]",
  md: "md:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))] lg:bottom-[max(1rem,env(safe-area-inset-bottom))] lg:right-[calc(min(520px,100vw-1rem)+max(0.5rem,env(safe-area-inset-right))+1rem)]",
  lg: "md:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))] xl:bottom-[max(1rem,env(safe-area-inset-bottom))] xl:right-[calc(640px+max(0.5rem,env(safe-area-inset-right))+1rem)]",
} as const;

export type ToastTone = "info" | "success" | "error" | "lead" | "contact";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Primary action: a hash link ("#/landing/abc") or a callback. */
  action?: { label: string; href?: string; onClick?: () => void };
  /** ms before it hides; 0 keeps it until dismissed. Default 6000 (0 for lead/contact). */
  duration?: number;
  /** Replaces an existing toast with the same id instead of adding another. */
  id?: string;
};

type ToastItem = Required<Pick<ToastInput, "title" | "tone" | "duration" | "id">> & Omit<ToastInput, "tone" | "duration" | "id">;

type ToastApi = { toast: (input: ToastInput) => string; dismiss: (id: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastTone, { icon: AdminIconName; ring: string; chip: string }> = {
  info: { icon: "info", ring: "", chip: "bg-fg/10 text-fg" },
  success: { icon: "check", ring: "", chip: "bg-[#6fd49a]/15 text-[#8fe2b1]" },
  error: { icon: "alert", ring: "border-[#ff8a7a]/50", chip: "bg-[#ff8a7a]/15 text-[#ff8a7a]" },
  lead: { icon: "rocket", ring: "border-accent/60", chip: "bg-accent text-canvas" },
  contact: { icon: "mail", ring: "border-[#7fb4ff]/50", chip: "bg-[#7fb4ff] text-canvas" },
};

const MAX_TOASTS = 4;
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setItems((list) => list.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const tone = input.tone ?? "info";
      const id = input.id ?? `t${++counter}`;
      const duration = input.duration ?? (tone === "lead" || tone === "contact" ? 0 : 6000);
      const item: ToastItem = { ...input, id, tone, duration };
      setItems((list) => [item, ...list.filter((t) => t.id !== id)].slice(0, MAX_TOASTS));
      const old = timers.current.get(id);
      if (old) window.clearTimeout(old);
      if (duration > 0) timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  const drawer = useOpenDrawerSize();

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[110] flex flex-col items-center gap-2 px-3 md:inset-x-auto md:items-end md:px-0",
          VIEWPORT_DESKTOP[drawer ?? "none"],
        )}
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const tone = TONE[item.tone];
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  const actionClass =
    "inline-flex min-h-9 items-center gap-1 rounded-[0.5rem] text-[0.8125rem] font-semibold text-accent underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11";
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      className={cx(
        surface.float,
        "pointer-events-auto flex w-full max-w-[24rem] items-start gap-3 p-3.5 transition-[opacity,transform] duration-200",
        tone.ring,
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <span className={cx("inline-flex size-9 shrink-0 items-center justify-center rounded-full", tone.chip)}>
        <AdminIcon name={tone.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[0.875rem] font-semibold leading-snug text-fg [overflow-wrap:anywhere]">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 line-clamp-3 text-[0.8125rem] leading-snug text-muted [overflow-wrap:anywhere]">{item.description}</p>
        ) : null}
        {item.action ? (
          item.action.href ? (
            <a
              href={item.action.href}
              onClick={() => {
                item.action?.onClick?.();
                onDismiss();
              }}
              className={cx(actionClass, "mt-1")}
            >
              {item.action.label}
              <AdminIcon name="arrowRight" size={14} />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                item.action?.onClick?.();
                onDismiss();
              }}
              className={cx(actionClass, "mt-1")}
            >
              {item.action.label}
            </button>
          )
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-[0.5rem] text-muted hover:bg-fg/[0.06] hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:size-10"
      >
        <AdminIcon name="close" size={16} />
      </button>
    </div>
  );
}

/** Toast API; a no-op fallback outside the provider so components never crash in isolation. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  return api ?? { toast: () => "", dismiss: () => undefined };
}
