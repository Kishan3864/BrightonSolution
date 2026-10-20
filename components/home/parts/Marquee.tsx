"use client";

import { useState } from "react";
import styles from "@/components/home/parts/Marquee.module.css";

/**
 * Full-bleed ticker of every tool name. The strip itself is decorative
 * (aria-hidden: the grouped chips below carry the same names), but its motion
 * can always be stopped with the visible 44px toggle (WCAG 2.2.2). Under
 * reduced motion the strip is static and the toggle is not rendered visible.
 */
export default function Marquee({ items }: { items: string[] }) {
  const [paused, setPaused] = useState(false);

  return (
    <div className={`${styles.root} ${paused ? styles.paused : ""}`}>
      <div className={`${styles.marquee} py-[clamp(1.25rem,0.9rem+1.2vw,2rem)]`} aria-hidden="true">
        <div className={styles.track}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.set}>
              {items.map((tool) => (
                <span
                  key={tool}
                  className="flex items-center font-display text-[clamp(1.5rem,1.1rem+1.8vw,2.75rem)] leading-none font-normal tracking-[-0.035em] whitespace-nowrap text-fg"
                >
                  {tool}
                  <span className="px-[clamp(1rem,0.6rem+1.2vw,2rem)] font-light text-line-strong">/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={`${styles.toggle} size-11 place-items-center rounded-sharp border border-line-strong bg-canvas text-fg transition-[border-color,color] duration-200 hover:border-accent hover:text-accent`}
        aria-pressed={paused}
        aria-label="Pause the technologies ticker"
        title={paused ? "Play" : "Pause"}
        onClick={() => setPaused((p) => !p)}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
          {paused ? <path d="M4.5 2.75v10.5L13 8z" /> : <path d="M4 2.5h2.75v11H4zM9.25 2.5H12v11H9.25z" />}
        </svg>
      </button>
    </div>
  );
}
