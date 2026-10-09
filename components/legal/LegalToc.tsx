"use client";

import { useEffect, useState } from "react";
import styles from "@/components/legal/legal.module.css";

type TocItem = { id: string; title: string };

type LegalTocProps = {
  sections: TocItem[];
  label?: string;
};

export default function LegalToc({ sections, label = "On this page" }: LegalTocProps) {
  const [active, setActive] = useState<string | null>(null);
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

  return (
    <nav
      aria-label={label}
      className={`${styles.toc} lg:max-h-[calc(100dvh_-_8rem)] lg:overflow-y-auto lg:overscroll-contain`}
    >
      <p className="eyebrow text-accent">Contents</p>
      <ol className="mt-4 grid grid-cols-1 gap-x-6 border-t border-line sm:grid-cols-2 md:grid-cols-1">
        {sections.map((s, i) => {
          const current = active === s.id;
          return (
            <li key={s.id} className="min-w-0 border-b border-line">
              <a
                href={`#${s.id}`}
                aria-current={current ? "location" : undefined}
                className={`${styles.tocLink} flex min-h-[44px] items-baseline gap-3 py-[11px] pl-3 pr-2 text-[0.9375rem] leading-[1.45] text-muted hover:text-ink`}
              >
                <span
                  className={`eyebrow w-[2ch] shrink-0 tabular-nums ${current ? "text-accent" : "text-muted"}`}
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
