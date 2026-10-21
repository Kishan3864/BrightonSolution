"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { isAdminPath } from "@/lib/analytics/env";
import { isLaunchPath, nav, site } from "@/lib/site";
import styles from "./Header.module.css";

const gutter = "px-[clamp(1rem,0.5rem+2.5vw,3rem)]";

const iconButton =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp border border-line text-fg transition-colors duration-200 hover:border-line-strong";

// Contact rows at the foot of the mobile menu: an icon tile and its label.
const contactRow =
  "group inline-flex min-h-[44px] min-w-0 items-center gap-3 text-[0.9375rem] text-fg transition-colors duration-200 hover:text-accent";
const contactTile =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp border border-line transition-colors duration-200 group-hover:border-accent";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const wasOpen = useRef(false);

  // The bar turns frosted once a 24px sentinel at the top of the document leaves the viewport:
  // an IntersectionObserver, so nothing runs on every scroll frame.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      // <html> has overflow-x: clip, so it (not <body>) defines the viewport's
      // scrolling box; lock both so the page behind the menu cannot scroll.
      const root = document.documentElement;
      const previousRoot = root.style.overflow;
      const previousBody = document.body.style.overflow;
      root.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      // Make everything outside the dialog inert for keyboard and AT users.
      const inertTargets = [document.getElementById("main"), document.querySelector("footer")].filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
      );
      inertTargets.forEach((el) => el.setAttribute("inert", ""));

      wasOpen.current = true;
      const id = window.requestAnimationFrame(() => firstLinkRef.current?.focus());

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          close();
          return;
        }
        if (e.key !== "Tab") return;
        const menu = document.getElementById("mobile-menu");
        if (!menu) return;
        const focusable = menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && menu.contains(active);
        if (e.shiftKey && (active === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey);

      // If the viewport grows past the lg breakpoint the overlay is hidden by
      // CSS, so close it to release the scroll lock and inert state.
      const mq = window.matchMedia("(min-width: 64rem)");
      const onChange = (e: MediaQueryListEvent) => {
        if (e.matches) close();
      };
      mq.addEventListener("change", onChange);

      return () => {
        root.style.overflow = previousRoot;
        document.body.style.overflow = previousBody;
        inertTargets.forEach((el) => el.removeAttribute("inert"));
        document.removeEventListener("keydown", onKey);
        mq.removeEventListener("change", onChange);
        window.cancelAnimationFrame(id);
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus();
    }
    return undefined;
  }, [open, close]);

  // The private /admin tool keeps only the logo bar: no public navigation or CTA.
  const admin = isAdminPath(pathname || "/");

  const isActive = (href: string) =>
    !href.includes("#") && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));

  // The private landing page brings its own focused bar (components/launch/LaunchHeader.tsx).
  if (isLaunchPath(pathname || "/")) return null;

  return (
    <>
      {/* Scroll sentinel: absolutely placed at the top of the document, never visible. */}
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-6 w-px" />

      <header className="sticky top-0 z-50">
        {/* The frosted layer lives in its own element: a backdrop-filter on <header> itself would
            become the containing block of the fixed mobile menu below and trap it inside the bar. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 border-b transition-[opacity,border-color] duration-300 ${styles.bar} ${
            scrolled || admin ? "border-line opacity-100" : "border-transparent opacity-0"
          }`}
        />

        <div className={`mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between md:h-[4.5rem] ${gutter}`}>
          <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home">
            <Logo titled />
          </Link>

          {admin ? null : (
            <>
              <nav className="hidden items-center lg:flex" aria-label="Primary">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="relative inline-flex min-h-[44px] items-center whitespace-nowrap px-2.5 text-[0.875rem] font-medium tracking-[-0.005em] text-muted transition-colors duration-200 after:pointer-events-none after:absolute after:inset-x-2.5 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:text-fg hover:after:scale-x-100 aria-[current=page]:text-fg aria-[current=page]:after:scale-x-100 xl:px-3.5 xl:after:inset-x-3.5"
                  >
                    {item.label}
                  </Link>
                ))}
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="BrightonSolution on Instagram (opens in a new tab)"
                  className="ml-2 inline-flex h-11 w-11 items-center justify-center rounded-sharp text-muted transition-colors duration-200 hover:text-accent xl:ml-3"
                >
                  <Icon name="instagram" size={20} />
                </a>
                <Button href="/contact" variant="dark" className="ml-2 xl:ml-3">
                  Let’s Talk
                </Button>
              </nav>

              <button
                ref={toggleRef}
                type="button"
                className={`${iconButton} lg:hidden`}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                <Icon name={open ? "close" : "menu"} size={22} />
              </button>
            </>
          )}
        </div>

        {admin ? null : (
          <div
            id="mobile-menu"
            hidden={!open}
            className={`fixed inset-0 z-[60] flex-col bg-canvas text-fg lg:hidden ${styles.sheet} ${open ? `flex ${styles.panel}` : "hidden"}`}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className={`flex h-16 shrink-0 items-center justify-between border-b border-line bg-canvas md:h-[4.5rem] ${styles.sheetTop} ${gutter}`}>
              <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home" onClick={close}>
                <Logo />
              </Link>
              <button type="button" className={iconButton} aria-label="Close menu" onClick={close}>
                <Icon name="close" size={22} />
              </button>
            </div>

            <nav className={`flex-1 overflow-y-auto py-[clamp(0.5rem,0.25rem+2.5vh,2.5rem)] ${styles.sheetNav} ${gutter}`} aria-label="Mobile">
              <ul className="flex flex-col">
                {nav.map((item, i) => (
                  <li
                    key={item.href}
                    className={`border-b border-line ${styles.item}`}
                    style={{ "--i": i } as CSSProperties}
                  >
                    <Link
                      ref={i === 0 ? firstLinkRef : undefined}
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      onClick={close}
                      className="group flex min-h-[44px] items-center justify-between gap-4 py-[clamp(0.25rem,0.1rem+1.4vh,1.125rem)] font-display text-[min(clamp(1.625rem,1.2rem+2.2vw,2.5rem),max(1.375rem,5.5vh))] font-medium leading-[1.1] tracking-[-0.035em] text-fg transition-colors duration-200 hover:text-accent aria-[current=page]:text-accent"
                    >
                      <span className="flex min-w-0 items-baseline gap-4">
                        <span
                          className="w-7 shrink-0 font-mono text-[0.8125rem] font-normal tracking-[0.06em] text-accent tabular-nums"
                          aria-hidden="true"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">{item.label}</span>
                      </span>
                      <Icon
                        name="arrow"
                        size={22}
                        className="text-muted transition-[color,transform] duration-200 group-hover:translate-x-1 group-hover:text-accent group-aria-[current=page]:text-accent"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Pinned to the bottom on tall screens; on short ones (under 42rem tall) the whole
                panel scrolls instead, so the six links always come first. */}
            <div className={`shrink-0 border-t border-line bg-surface pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${gutter}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
                <a
                  href={`mailto:${site.email}`}
                  aria-label={`Email ${site.email}`}
                  className={contactRow}
                >
                  <span className={contactTile}>
                    <Icon name="mail" size={20} />
                  </span>
                  <span className="min-w-0 break-all">{site.email}</span>
                </a>
                <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className={contactRow}>
                  <span className={contactTile}>
                    <Icon name="instagram" size={20} />
                  </span>
                  <span>Instagram</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <div className="mt-5">
                <Button href="/contact" className="w-full">
                  Let’s Talk
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
