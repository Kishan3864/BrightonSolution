"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import styles from "@/components/home/parts/ProcessRail.module.css";

/**
 * Horizontal scroller for the process steps (from md). It bleeds to the
 * viewport's right edge with a fade, and pads back so the last step snaps fully
 * into the container's column. Previous/next buttons move one step; at the ends
 * they are aria-disabled (never `disabled`, so a focused button keeps focus).
 * The scroller takes keyboard focus only while it actually scrolls, so arrow
 * keys can move it. Phones get the same list as a vertical timeline.
 */
export default function ProcessRail({ label, children }: { label: string; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      setScrollable(max > 1);
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft >= max - 2);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    el.addEventListener("scroll", schedule, { passive: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resize?.observe(el);
    return () => {
      el.removeEventListener("scroll", schedule);
      resize?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const step = el.querySelector<HTMLElement>("[data-step]");
    const distance = step ? step.getBoundingClientRect().width : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * distance, behavior: reduce ? "auto" : "smooth" });
  };

  const prevOff = !scrollable || atStart;
  const nextOff = !scrollable || atEnd;

  const button =
    "grid size-11 place-items-center rounded-sharp border border-line-strong text-fg transition-[border-color,background-color,opacity] duration-200 hover:border-fg hover:bg-fg/5 aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:border-line-strong aria-disabled:hover:bg-transparent";

  return (
    <div>
      <div className="mb-6 hidden justify-end gap-2 md:flex">
        <button
          type="button"
          className={button}
          onClick={() => {
            if (prevOff) return;
            move(-1);
          }}
          aria-disabled={prevOff}
          aria-label="Previous steps"
        >
          <Icon name="arrow" size={18} className="rotate-180" />
        </button>
        <button
          type="button"
          className={button}
          onClick={() => {
            if (nextOff) return;
            move(1);
          }}
          aria-disabled={nextOff}
          aria-label="Next steps"
        >
          <Icon name="arrow" size={18} />
        </button>
      </div>
      <div
        ref={scroller}
        className={styles.scroller}
        data-end={scrollable && !atEnd ? "false" : "true"}
        role="region"
        aria-label={label}
        tabIndex={scrollable ? 0 : undefined}
      >
        {children}
      </div>
    </div>
  );
}
