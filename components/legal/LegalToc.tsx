"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/components/legal/legal.module.css";

type TocItem = { id: string; title: string };

type LegalTocProps = {
  sections: TocItem[];
  label?: string;
};

/**
 * Contents panel for a legal page. The section in the reading band is marked
 * with aria-current and highlighted; on desktop the panel scrolls on its own
 * and keeps the current item in view (a direct scrollTop change, no animation,
 * and never a window scroll).
 *   < 640px   one column
 *   640-767px two columns
 *   768px+    one column in the sticky rail
 */
export default function LegalToc({ sections, label = "On this page" }: LegalTocProps) {
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const ids = sections.map((s) => s.id).join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const order = ids.split("|");
    const elements = order
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        }
        const first = order.find((id) => inView.has(id));
        if (first) setActive(first);
      },
      // A thin band near the top of the viewport decides which section is current.
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  // Keep the current item visible inside the panel when the panel itself scrolls.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !active || nav.scrollHeight <= nav.clientHeight + 1) return;
    const link = nav.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`);
    if (!link) return;
    const navBox = nav.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const margin = 48;
    if (linkBox.top < navBox.top + margin) {
      nav.scrollTop -= navBox.top + margin - linkBox.top;
    } else if (linkBox.bottom > navBox.bottom - margin) {
      nav.scrollTop += linkBox.bottom - (navBox.bottom - margin);
    }
  }, [active]);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={`${styles.toc} rounded-[var(--radius-card)] border border-line bg-surface p-2.5 md:max-h-[calc(100dvh_-_8rem)] md:overflow-y-auto md:overscroll-contain`}
    >
      <p className="eyebrow px-3 pb-3 pt-2.5 text-accent">Contents</p>
      <ol className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-2 md:grid-cols-1">
        {sections.map((s, i) => {
          const current = active === s.id;
          return (
            <li key={s.id} className="min-w-0">
              <a
                href={`#${s.id}`}
                aria-current={current ? "location" : undefined}
                className={`${styles.tocLink} flex min-h-[44px] items-baseline gap-3 rounded-sharp px-3 py-[11px] text-[0.875rem] leading-[1.45] text-muted hover:bg-surface-2 hover:text-fg`}
              >
                <span
                  className={`eyebrow w-[2ch] shrink-0 tabular-nums transition-colors duration-200 ${current ? "text-accent" : "text-muted"}`}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{s.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
