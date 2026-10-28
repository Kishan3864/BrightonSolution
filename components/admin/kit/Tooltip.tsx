"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import AdminIcon from "./AdminIcon";
import { cx, surface } from "./cx";

/**
 * Tooltip: shows `content` on hover and keyboard focus of its trigger (and on tap for InfoTip).
 * Rendered in a portal with fixed positioning clamped to the viewport, so it never causes sideways
 * scrolling on phones. The trigger gets aria-describedby; Escape hides it.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
  disabled = false,
}: {
  content: ReactNode;
  /** The trigger: a single focusable element or text. Wrapped in an inline span that listens for hover/focus. */
  children: ReactNode;
  side?: "top" | "bottom" | "right";
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      ref={anchor}
      className={cx("inline-flex min-w-0", className)}
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open && !disabled ? id : undefined}
    >
      {children}
      {open && !disabled ? (
        <FloatingTip id={id} anchor={anchor} side={side}>
          {content}
        </FloatingTip>
      ) : null}
    </span>
  );
}

/**
 * Small (i) button with a definition. Opens on mouse hover, keyboard focus or a tap/click. Focus
 * that comes from a pointer is ignored (the click decides), so a tap does not open and instantly
 * close it. The definition is always the button's description for screen readers.
 */
export function InfoTip({ text, label = "What does this mean?" }: { text: ReactNode; label?: string }) {
  const id = useId();
  const descId = useId();
  const anchor = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  /** Pointer type of the press in progress ("" = keyboard). */
  const pressedWith = useRef("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onDown = (event: PointerEvent) => {
      if (anchor.current && !anchor.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={label}
        aria-describedby={descId}
        aria-expanded={open}
        onPointerDown={(event) => {
          pressedWith.current = event.pointerType || "mouse";
        }}
        onClick={(event) => {
          event.stopPropagation();
          const by = pressedWith.current;
          pressedWith.current = "";
          // A mouse click after hovering keeps it open; taps and Enter/Space toggle.
          if (by === "mouse") setOpen(true);
          else setOpen((value) => !value);
        }}
        onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
        onFocus={() => {
          if (!pressedWith.current) setOpen(true);
        }}
        onBlur={() => {
          pressedWith.current = "";
          setOpen(false);
        }}
        className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted/80 transition-colors hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent before:absolute before:-inset-2.5 before:content-['']"
      >
        <AdminIcon name="info" size={14} />
        {open ? (
          <FloatingTip id={id} anchor={anchor} side="top">
            {text}
          </FloatingTip>
        ) : null}
      </button>
      <span id={descId} hidden>
        {text}
      </span>
    </>
  );
}

const GAP = 8;
const EDGE = 8;

function FloatingTip({
  id,
  anchor,
  side,
  children,
}: {
  id: string;
  anchor: React.RefObject<HTMLElement | null>;
  side: "top" | "bottom" | "right";
  children: ReactNode;
}) {
  const tip = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect();
    const t = tip.current?.getBoundingClientRect();
    if (!a || !t) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top: number;
    let left: number;
    if (side === "right" && a.right + GAP + t.width <= vw - EDGE) {
      left = a.right + GAP;
      top = a.top + a.height / 2 - t.height / 2;
    } else {
      left = a.left + a.width / 2 - t.width / 2;
      const above = a.top - GAP - t.height;
      const below = a.bottom + GAP;
      top = side === "bottom" ? (below + t.height <= vh - EDGE ? below : above) : above >= EDGE ? above : below;
    }
    left = Math.max(EDGE, Math.min(left, vw - EDGE - t.width));
    top = Math.max(EDGE, Math.min(top, vh - EDGE - t.height));
    setPos({ top, left });
  }, [anchor, side]);

  useLayoutEffect(() => {
    place();
  }, [place]);

  useEffect(() => {
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [place]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={tip}
      id={id}
      role="tooltip"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      className={cx(
        surface.float,
        "pointer-events-none fixed z-[120] max-w-[min(18rem,calc(100vw-1rem))] px-3 py-2 text-left text-[0.75rem] font-normal normal-case leading-relaxed tracking-normal text-fg",
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
