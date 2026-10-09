"use client";

import { useEffect } from "react";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import EmailLine from "@/components/system/EmailLine";

type ErrorPageProps = {
  error: Error & { digest?: string };
  /**
   * Re-fetches the route (router.refresh) and re-renders the segment. If the
   * fetch fails or the build changed after a deploy, Next falls back to a full
   * page load. Use this, not reset(), which only re-renders the same tree.
   */
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <section
      aria-labelledby="error-title"
      className="pt-[clamp(3rem,2rem+4vw,6rem)] pb-[clamp(3.5rem,2rem+6vw,7.5rem)]"
    >
      <Container>
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow text-accent">Something went wrong</p>
          </div>
          <div className="min-w-0 md:col-span-8 lg:col-span-9">
            <h1 id="error-title" className="text-h1 max-w-[18ch] text-balance tracking-tight">
              This page hit an unexpected error
            </h1>
            <p className="text-lead mt-6 max-w-[58ch] text-muted">
              It is usually temporary. Try loading it again, or continue from the home page — the rest of the site is
              unaffected.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <button
                type="button"
                onClick={() => retry()}
                className="group inline-flex min-h-[44px] items-center justify-center gap-3 whitespace-nowrap rounded-sharp bg-ink px-6 py-2.5 text-[0.9375rem] font-semibold tracking-tight text-paper transition-colors duration-200 hover:bg-accent"
              >
                <span>Try again</span>
                <Icon name="arrow" size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              {/* Plain <a> (same classes as Button's ghost variant), not next/link: a full
                  document load still works when the client router is what broke. */}
              <a
                href="/"
                className="group inline-flex min-h-[44px] items-center justify-center gap-2.5 whitespace-nowrap rounded-sharp py-2.5 text-[0.9375rem] font-medium leading-none tracking-[-0.01em] transition-colors duration-200 text-ink underline-offset-[6px] decoration-1 hover:underline [.section-dark_&]:text-paper"
              >
                <span>Go to home</span>
                <Icon name="arrow" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
            <div className="hairline mt-[clamp(2.5rem,1.5rem+3vw,4rem)]" />
            <EmailLine className="mt-6" lead="If it keeps happening, let us know at" />
            {error.digest ? (
              <p className="mt-2 font-mono text-[0.75rem] tracking-[0.06em] text-muted">Reference {error.digest}</p>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
