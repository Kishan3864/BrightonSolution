"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { ctaLabel } from "@/lib/content/launch";
import styles from "./launch.module.css";

/**
 * Phones only: a bottom bar with the one CTA. It appears once the hero has scrolled out of view and
 * hides while the form (or the plans, which carry their own buttons) is on screen.
 */
export default function MobileCtaBar() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        setShown(!visible.get("hero") && !visible.get("brief") && !visible.get("plans"));
      },
      { threshold: 0 },
    );
    for (const id of ["hero", "brief", "plans"]) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.mobileBar} data-shown={shown} aria-hidden={!shown} inert={!shown}>
      <a
        href="#brief"
        data-track="cta_click"
        data-track-label="launch_mobile_bar"
        className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-sharp bg-accent px-5 text-[0.9375rem] font-semibold tracking-tight text-canvas"
      >
        {ctaLabel}
        <Icon name="arrow" size={18} />
      </a>
    </div>
  );
}
