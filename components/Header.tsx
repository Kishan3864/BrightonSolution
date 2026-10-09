"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { nav, site } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setCompact(window.scrollY > 24);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const isActive = (href: string) => !href.includes("#") && pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div
        className={`mx-auto flex w-full max-w-[1320px] items-center justify-between px-[clamp(1rem,0.5rem+2.5vw,3rem)] transition-[height] duration-200 ease-out ${
          compact ? "h-14 md:h-16" : "h-16 md:h-20"
        }`}
      >
        <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home">
          <Logo variant="dark" titled />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex xl:gap-2" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center px-3 text-[0.9375rem] font-medium tracking-tight decoration-1 underline-offset-8 transition-colors hover:underline ${
                isActive(item.href) ? "text-ink underline" : "text-ink/80 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Button href="/contact" variant="dark" className="ml-3">
            Let’s Talk
          </Button>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-sharp text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className={`fixed inset-0 z-[60] flex-col bg-ink text-paper lg:hidden ${open ? "flex" : "hidden"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line-dark px-[clamp(1rem,0.5rem+2.5vw,3rem)]">
          <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home" onClick={close}>
            <Logo variant="light" />
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-sharp text-paper"
            aria-label="Close menu"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-[clamp(1rem,0.5rem+2.5vw,3rem)] py-8" aria-label="Mobile">
          <ul className="flex flex-col">
            {nav.map((item, i) => (
              <li key={item.href} className="border-b border-line-dark">
                <Link
                  ref={i === 0 ? firstLinkRef : undefined}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={close}
                  className="flex min-h-[44px] items-center justify-between py-4 text-3xl font-semibold tracking-tight text-paper"
                >
                  <span>{item.label}</span>
                  <Icon name="arrow" className="text-accent-soft" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line-dark px-[clamp(1rem,0.5rem+2.5vw,3rem)] py-6">
          <p className="eyebrow text-accent-soft">Email</p>
          <a
            href={`mailto:${site.email}`}
            className="mt-2 inline-flex min-h-[44px] items-center break-all text-paper underline-offset-8 decoration-1 hover:underline"
          >
            {site.email}
          </a>
          <div className="mt-4">
            <Button href="/contact" variant="light" className="w-full">
              Let’s Talk
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
