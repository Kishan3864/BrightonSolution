"use client";

import { useEffect, useRef } from "react";

/**
 * The logo's sun, turning slowly in 3D. The flat mark below is the poster: it is what shows first, and it
 * stays when WebGL2 is missing, Save-Data is on, or the visitor prefers reduced motion (one still frame).
 */
export default function HeroSun({ className = "" }: { className?: string }) {
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const { mountSun } = await import("@/lib/3d/sun");
        if (cancelled) return;
        dispose = mountSun(el)?.dispose;
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <div ref={slot} className={`hero-sun ${className}`.trim()} aria-hidden="true">
      <svg className="hero-sun-poster" viewBox="114 4 31 31" fill="none" focusable="false">
        <path
          d="M129.465 10.7324C124.647 10.7324 120.732 14.6472 120.732 19.4653C120.732 24.2834 124.647 28.1982 129.465 28.1982C134.283 28.1982 138.198 24.2834 138.198 19.4653C138.198 14.6472 134.283 10.7324 129.465 10.7324ZM129.465 26.0484C125.851 26.0484 122.882 23.1224 122.882 19.4653C122.882 15.8518 125.807 12.8822 129.465 12.8822C133.122 12.8822 136.048 15.8515 136.048 19.4653C136.048 23.079 133.078 26.0484 129.465 26.0484Z"
          fill="#ED943B"
        />
        <g fill="#EDB43B">
          <path d="M128.39 6H130.584V8.83951H128.39V6Z" />
          <path d="M136.22 11.1897L138.228 9.18164L139.779 10.7329L137.771 12.741L136.22 11.1897Z" />
          <path d="M140.09 18.3906H142.93V20.5843H140.09V18.3906Z" />
          <path d="M136.216 27.7388L137.768 26.1875L139.776 28.1956L138.224 29.7468L136.216 27.7388Z" />
          <path d="M128.39 30.0898H130.584V32.9294H128.39V30.0898Z" />
          <path d="M119.183 28.2288L121.191 26.2207L122.742 27.7717L120.734 29.7801L119.183 28.2288Z" />
          <path d="M116 18.3906H118.84V20.5843H116V18.3906Z" />
          <path d="M119.183 10.7016L120.734 9.15039L122.742 11.1585L121.191 12.7097L119.183 10.7016Z" />
        </g>
      </svg>
    </div>
  );
}
