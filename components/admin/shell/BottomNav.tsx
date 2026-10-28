"use client";

import AdminIcon from "../kit/AdminIcon";
import { cx } from "../kit/cx";
import { useAdminData } from "../data/AdminDataProvider";
import { NAV_ITEMS } from "./nav";
import type { Route } from "./router";

/**
 * Phone tab bar (below md): five 56px+ targets with icon, short label and unread badges, above the
 * home indicator (safe-area padding). Frosted so content scrolls visibly underneath.
 */
export default function BottomNav({ route }: { route: Route }) {
  const { counts } = useAdminData();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0b0c10]/90 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="mx-auto grid max-w-[34rem] grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = route.view === item.key;
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <li key={item.key} className="min-w-0">
              <a
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Name starts with the visible label ("Home") so voice control matches it (WCAG 2.5.3).
                aria-label={count ? `${item.short}, ${count} new` : item.short}
                className={cx(
                  "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[0.6875rem] font-medium transition-colors focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent active:opacity-70",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <span className={cx("relative inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-accent/15")}>
                  <AdminIcon name={item.icon} size={21} className={active ? "text-accent" : ""} strokeWidth={active ? 2.2 : 2} />
                  {count ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 left-[calc(50%+4px)] inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.625rem] font-semibold leading-none text-canvas ring-2 ring-canvas"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true" className="max-w-full truncate">
                  {item.short}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
