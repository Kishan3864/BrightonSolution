"use client";

import { useState, type CSSProperties } from "react";
import AppIcon from "@/components/work/AppIcon";
import type { AndroidApp } from "@/lib/work";
import styles from "./AppOrbit.module.css";

type AppOrbitProps = {
  apps: AndroidApp[];
  /** Short label under the count in the centre, e.g. "Android apps". */
  label: string;
};

/**
 * The Google Play apps on a slowly turning ring (CSS transforms only). The ring
 * pauses while the pointer is over it or a link inside has focus, and is still
 * under reduced motion. Hovering or focusing an app shows its name and summary
 * in the centre. Every app is a real link with an accessible name.
 * The ring needs hover to reveal names, so it shows only from 768px on devices
 * with a fine, hovering pointer; phones and touch tablets get a list of named tiles.
 */
export default function AppOrbit({ apps, label }: AppOrbitProps) {
  const [active, setActive] = useState<number | null>(null);
  const current = active === null ? null : apps[active];

  return (
    <>
      {/* Ring, from 768px on devices that can hover (names show on hover or focus). */}
      <div
        className={styles.orbit}
        style={{ "--n": apps.length } as CSSProperties}
        onMouseLeave={() => setActive(null)}
      >
        <span aria-hidden="true" className={styles.path} />

        <div aria-hidden="true" className={styles.core}>
          <div className={`${styles.readout} ${current ? "" : styles.isShown}`}>
            <p className="font-display text-[clamp(3rem,2rem+3vw,4.5rem)] font-medium leading-none tracking-[-0.05em] text-fg">
              {apps.length}
            </p>
            <p className="eyebrow mt-3 text-muted">{label}</p>
          </div>
          {apps.map((app, i) => (
            <div key={app.slug} className={`${styles.readout} ${active === i ? styles.isShown : ""}`}>
              <p className="font-display text-[clamp(1.125rem,0.9rem+0.8vw,1.5rem)] font-medium leading-[1.15] tracking-[-0.025em] text-fg">
                {app.name}
              </p>
              <p className="mt-2 text-[0.8125rem] leading-snug text-muted lg:text-[0.875rem]">{app.summary}</p>
            </div>
          ))}
        </div>

        <ul role="list" className={styles.ring}>
          {apps.map((app, i) => (
            <li key={app.slug} className={styles.slot} style={{ "--i": i } as CSSProperties}>
              <span className={styles.upright}>
                <a
                  href={app.playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="play"
                  data-track-label={app.name}
                  className={styles.tile}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <AppIcon app={app} size={64} className={styles.icon} />
                  <span className="sr-only">{app.name} on Google Play (opens in a new tab)</span>
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Named tiles everywhere else (phones, touch tablets): one column on the narrowest
          phones, two from 400px. */}
      <ul role="list" className={`${styles.list} grid grid-cols-1 gap-2.5 min-[25rem]:grid-cols-2`}>
        {apps.map((app) => (
          <li key={app.slug} className="min-w-0">
            <a
              href={app.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="play"
              data-track-label={app.name}
              className="flex h-full min-h-[44px] items-center gap-3 rounded-sharp border border-line bg-surface p-2.5 transition-colors duration-200 hover:border-line-strong"
            >
              <AppIcon app={app} size={40} />
              <span className="min-w-0 text-[0.8125rem] font-medium leading-snug tracking-tight break-words">
                {app.name}
                <span className="sr-only"> on Google Play (opens in a new tab)</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
