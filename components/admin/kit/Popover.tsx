"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cx, surface } from "./cx";

/**
 * Anchored floating panel (bell menu, search results). Closes on Escape (focus returns to the
 * anchor's visible trigger button or field) and on a pointer down outside it and its anchor. On
 * phones it spans the width under the top bar; on md+ it hangs from the anchor's right edge.
 * Position: the parent of the anchor must be `relative`. Give it an `id` for the trigger's aria-controls.
 */
export default function Popover({
  open,
  onClose,
  anchorRef,
  children,
  label,
  className,
  width = "22rem",
  id,
}: {
  id?: string;
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Accessible name of the panel. */
  label: string;
  className?: string;
  /** Width on md+. */
  width?: string;
}) {
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // The anchor is a wrapper; focus its visible trigger (not one inside this panel).
        const trigger = Array.from(anchorRef.current?.querySelectorAll<HTMLElement>("button, input") ?? []).find(
          (el) => !panel.current?.contains(el) && el.offsetParent !== null,
        );
        onClose();
        trigger?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return (
    <div
      ref={panel}
      id={id}
      role="dialog"
      aria-label={label}
      style={{ ["--pop-w" as string]: width }}
      className={cx(
        surface.float,
        "fixed inset-x-2 top-[calc(3.75rem+env(safe-area-inset-top))] z-[95] max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-[var(--pop-w)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
