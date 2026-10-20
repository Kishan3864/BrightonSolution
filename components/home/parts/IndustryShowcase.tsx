"use client";

import { useEffect, useRef, useState } from "react";

export type IndustryVisual =
  | { kind: "site"; src: string; caption: string; host: string }
  | { kind: "type"; category: string; tagline: string; tags: string[]; caption: string; host: string }
  | { kind: "apps"; icons: { src: string; name: string }[]; caption: string; host: string };

export type IndustryRow = {
  name: string;
  line: string;
  num: string;
  visual: IndustryVisual;
};

/**
 * Numbered list of industries beside a sticky preview of real work from that
 * sector. The row crossing the middle of the viewport (or the one under the
 * pointer) is the active one and its screenshot cross-fades in. The preview
 * repeats work shown elsewhere, so it is decorative (aria-hidden). Without JS
 * the first screenshot shows; under reduced motion the swap is instant.
 */
export default function IndustryShowcase({ rows }: { rows: IndustryRow[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-index]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      // A thin band just above the middle of the viewport.
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-x-12 lg:grid-cols-12 xl:gap-x-16">
      <ol ref={listRef} role="list" className="min-w-0 border-b border-line lg:col-span-6">
        {rows.map((row, i) => {
          const on = i === active;
          return (
            <li
              key={row.name}
              data-index={i}
              onPointerEnter={() => setActive(i)}
              className="relative grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 gap-y-1.5 border-t border-line py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem] sm:gap-x-5 lg:grid-cols-[2.5rem_minmax(0,1fr)] lg:py-6 lg:pl-5"
            >
              {/* Active marker (desktop): an orange rule on the row's leading edge. */}
              <span
                aria-hidden="true"
                className={`absolute top-6 bottom-6 left-0 hidden w-0.5 origin-top bg-accent transition-transform duration-300 motion-reduce:transition-none lg:block ${
                  on ? "scale-y-100" : "scale-y-0"
                }`}
              />
              <span
                aria-hidden="true"
                className={`eyebrow self-center tabular-nums transition-colors sm:self-start sm:pt-1 duration-300 ${on ? "text-accent" : "text-muted"}`}
              >
                {row.num}
              </span>
              <h3 className="col-start-2 row-start-1 min-w-0 self-center break-words sm:self-start text-[clamp(1.125rem,1rem+0.6vw,1.5rem)] leading-tight font-medium tracking-[-0.02em]">
                {row.name}
              </h3>
              <p className="col-[2/4] row-start-2 max-w-[48ch] text-[0.9375rem] leading-relaxed text-muted sm:col-[2/3]">
                {row.line}
              </p>
              {/* Inline thumbnail below lg, where there is no sticky preview. */}
              <div
                aria-hidden="true"
                className="col-start-3 row-[1/2] overflow-hidden rounded-sharp sm:row-[1/3] border border-line bg-surface-2 lg:hidden"
              >
                <div className="relative aspect-[16/10]">
                  <Visual visual={row.visual} compact />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div aria-hidden="true" className="hidden min-w-0 lg:col-span-6 lg:block">
        <div className="sticky top-28">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
            {rows.map((row, i) => (
              <div
                key={row.name}
                className={`absolute inset-0 transition-[opacity,scale] duration-500 ease-out motion-reduce:transition-none ${
                  i === active ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
                }`}
              >
                <Visual visual={row.visual} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex min-w-0 items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate font-medium">{rows[active].visual.caption}</span>
            <span className="shrink-0 font-mono text-[0.8125rem] text-muted">{rows[active].visual.host}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Visual({ visual, compact = false }: { visual: IndustryVisual; compact?: boolean }) {
  if (visual.kind === "site") {
    return (
      <img
        src={visual.src}
        alt=""
        width={1200}
        height={750}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 block h-full w-full object-cover object-top"
      />
    );
  }

  if (visual.kind === "type") {
    if (compact) {
      return (
        <div className="absolute inset-0 flex items-end bg-surface-2 p-2 sm:p-3">
          <p className="line-clamp-2 min-w-0 font-display text-[0.6875rem] leading-[1.15] font-medium tracking-[-0.02em] [overflow-wrap:anywhere] text-fg sm:text-[0.9375rem]">
            {visual.caption}
          </p>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col justify-between bg-surface-2 p-[clamp(1.5rem,1rem+2vw,2.75rem)]">
        <p className="eyebrow text-muted">{visual.category}</p>
        <div className="min-w-0">
          <p className="max-w-[18ch] font-display text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] leading-[1.05] font-medium tracking-[-0.035em] text-balance text-fg">
            {visual.tagline}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {visual.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-sharp border border-line-strong px-2.5 py-1 font-mono text-[0.75rem] tracking-[0.04em] text-muted uppercase"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="absolute inset-0 flex items-center justify-center gap-[8%]">
        {visual.icons.slice(0, 2).map((icon) => (
          <img
            key={icon.src}
            src={icon.src}
            alt=""
            width={192}
            height={192}
            loading="lazy"
            decoding="async"
            className="block aspect-square h-[64%] w-auto rounded-sharp"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid grid-cols-4 place-content-center gap-[clamp(0.75rem,0.4rem+1vw,1.5rem)] px-[10%]">
      {visual.icons.map((icon) => (
        <img
          key={icon.src}
          src={icon.src}
          alt=""
          width={192}
          height={192}
          loading="lazy"
          decoding="async"
          className="block aspect-square w-full rounded-sharp"
        />
      ))}
    </div>
  );
}
