"use client";

import { LogoMark } from "@/components/Logo";
import AdminIcon from "../kit/AdminIcon";
import { Badge } from "../kit/Pills";
import { cx } from "../kit/cx";
import { initials } from "../data/records";
import { useAdminData } from "../data/AdminDataProvider";
import { NAV_ITEMS } from "./nav";
import type { Route } from "./router";

/**
 * Left navigation for tablets and desktops (hidden below md, where BottomNav takes over).
 * md..lg: a 72px icon rail with labels in hover/focus tooltips. lg+: a 248px sidebar that can be
 * collapsed to the rail (the choice is remembered by AdminApp). Footer: signed-in email + sign out.
 */
export default function Sidebar({
  route,
  collapsed,
  onToggle,
}: {
  route: Route;
  /** Collapsed to the icon rail on lg+ (always a rail on md..lg). */
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { counts, email, signOut, mode } = useAdminData();
  // Labels and tooltips: a rail below lg, and on lg+ only when collapsed.
  const label = collapsed ? "sr-only" : "sr-only lg:not-sr-only";
  const tip = collapsed ? "md:block" : "md:block lg:hidden";

  return (
    <aside
      aria-label="Admin navigation"
      className={cx(
        "relative z-40 hidden shrink-0 flex-col border-r border-line bg-[#0e0f14] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)] transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-[72px] lg:w-[248px]",
      )}
    >
      {/* Brand */}
      <div className={cx("flex h-16 shrink-0 items-center gap-3 border-b border-line px-[22px]", !collapsed && "lg:px-5")}>
        <a href="#/overview" aria-label="BrightonSolution Admin, overview" className="flex min-w-0 items-center gap-3 rounded-sharp focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <LogoMark className="size-7 shrink-0" />
          <span className={cx(label, "min-w-0 leading-tight")}>
            <span className="block truncate font-display text-[0.9375rem] font-semibold tracking-[-0.02em] text-fg">BrightonSolution</span>
            <span className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted">Admin{mode === "demo" ? " · demo" : ""}</span>
          </span>
        </a>
      </div>

      {/* Menu */}
      {/* No overflow here, so the rail tooltips can leave the sidebar; only on short landscape screens
          (touch, no hover labels) does the menu scroll instead of running under the footer. */}
      <nav aria-label="Main" className="min-h-0 flex-1 px-3 py-4 [@media(max-height:560px)]:overflow-y-auto [@media(max-height:560px)]:py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = route.view === item.key;
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <li key={item.key} className="group relative">
                <a
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={count ? `${item.label}, ${count} new` : item.label}
                  className={cx(
                    "relative flex min-h-11 items-center gap-3 rounded-sharp px-3 text-[0.875rem] font-medium transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent",
                    active ? "bg-fg/[0.07] text-fg" : "text-muted hover:bg-fg/[0.04] hover:text-fg",
                  )}
                >
                  {active ? <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-accent" /> : null}
                  <span className="relative">
                    <AdminIcon name={item.icon} size={20} className={active ? "text-accent" : ""} />
                    {count ? (
                      <span
                        aria-hidden="true"
                        className={cx("absolute -right-1.5 -top-1.5 size-2.5 rounded-full bg-accent ring-2 ring-[#0e0f14]", !collapsed && "lg:hidden")}
                      />
                    ) : null}
                  </span>
                  <span aria-hidden="true" className={cx(label, "min-w-0 flex-1 truncate")}>
                    {item.label}
                  </span>
                  {count ? (
                    <span aria-hidden="true" className={cx("hidden", !collapsed && "lg:inline-flex")}>
                      <Badge count={count} />
                    </span>
                  ) : null}
                </a>
                {/* Rail tooltip */}
                <span
                  role="presentation"
                  className={cx(
                    "pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-[0.5rem] border border-line-strong bg-surface-2 px-2.5 py-1.5 text-[0.8125rem] font-medium text-fg opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
                    tip,
                  )}
                >
                  {item.label}
                  {count ? <span className="ml-1.5 font-mono text-accent">{count}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: account */}
      <div className="shrink-0 space-y-1 border-t border-line p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={collapsed}
          className="hidden min-h-10 w-full items-center gap-3 rounded-sharp px-3 text-[0.8125rem] text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent lg:flex"
        >
          <AdminIcon name="panelLeft" size={18} />
          <span className={label}>{collapsed ? "Expand menu" : "Collapse menu"}</span>
          {collapsed ? <span className="sr-only">Expand menu</span> : null}
        </button>
        <div className={cx("flex items-center gap-2.5 rounded-sharp px-1.5 py-1.5", collapsed ? "flex-col" : "flex-col lg:flex-row")}>
          <span
            aria-hidden="true"
            title={email}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[0.75rem] font-semibold text-accent"
          >
            {initials(email.split("@")[0]?.replace(/[._-]+/g, " "))}
          </span>
          <div className={cx(label, "min-w-0 flex-1")}>
            <p className="truncate text-[0.8125rem] text-fg" title={email}>
              {email}
            </p>
            <p className="text-[0.6875rem] text-muted">{mode === "demo" ? "Demo mode" : "Signed in"}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-sharp text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          >
            <AdminIcon name="logOut" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
