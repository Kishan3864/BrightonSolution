"use client";

import { useEffect, useState } from "react";
import AdminIcon from "./AdminIcon";
import { cx } from "./cx";

/** Copies `value` to the clipboard; the icon turns into a check for 1.5 s. Silent when the clipboard is blocked. */
export default function CopyButton({
  value,
  label = "Copy",
  showLabel = false,
  className,
}: {
  value: string;
  /** Accessible name, e.g. "Copy email". */
  label?: string;
  /** Show the label text beside the icon. */
  showLabel?: boolean;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 1500);
    return () => window.clearTimeout(timer);
  }, [done]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
    } catch {
      /* clipboard blocked (insecure context or permission): nothing to do */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={showLabel ? undefined : label}
      title={label}
      className={cx(
        "inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-[0.5rem] px-1.5 text-[0.75rem] font-medium text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-10 pointer-coarse:min-w-10",
        done && "text-[#8fe2b1] hover:text-[#8fe2b1]",
        className,
      )}
    >
      <AdminIcon name={done ? "check" : "copy"} size={14} />
      {showLabel ? <span>{done ? "Copied" : label}</span> : null}
      <span className="sr-only" role="status">
        {done ? "Copied" : ""}
      </span>
    </button>
  );
}
