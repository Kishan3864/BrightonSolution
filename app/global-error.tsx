"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  /**
   * Re-fetches the route (router.refresh) and re-renders. If the fetch fails or
   * the build changed after a deploy, Next falls back to a full page load.
   * Use this, not reset(), which only re-renders the same tree.
   */
  retry: () => void;
};

/*
 * Last-resort boundary: replaces the root layout when it fails.
 * Inline styles and the system font stack only, so it renders even if CSS,
 * fonts or the layout itself could not load. Because it replaces the layout,
 * the layout's viewport export is gone too, so the viewport meta is set here.
 */
/* Theme v2 "Sunrise" tokens, copied from app/globals.css (CSS may not have loaded here). */
const CANVAS = "#0b0c10";
const FG = "#f3f0ea";
const MUTED = "#a2a5ae";
const LINE = "rgba(243, 240, 234, 0.11)";
const LINE_STRONG = "rgba(243, 240, 234, 0.24)";
const ACCENT = "#ed943b";
const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const control: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 24px",
  borderRadius: 12,
  fontFamily: SANS,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  textDecoration: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en" style={{ background: CANVAS, colorScheme: "dark" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong — BrightonSolution</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: CANVAS,
          color: FG,
          colorScheme: "dark",
          fontFamily: SANS,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main
          style={{
            boxSizing: "border-box",
            maxWidth: 760,
            margin: "0 auto",
            padding: "clamp(48px, 10vw, 120px) clamp(16px, 5vw, 48px)",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>BrightonSolution</p>
          <div style={{ borderTop: `1px solid ${LINE}`, margin: "28px 0 40px" }} />
          {/* Title band, as on every page: the name, then a rule that drops under it when the row is too narrow. */}
          <p
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px 20px",
              margin: 0,
              fontSize: "clamp(22px, 0.7vw + 19px, 28px)",
              lineHeight: 1.2,
              fontWeight: 500,
              letterSpacing: "-0.025em",
            }}
          >
            <span>Something went wrong</span>
            <span aria-hidden="true" style={{ flex: "1 1 120px", borderTop: `1px solid ${LINE_STRONG}` }} />
          </p>
          <h1
            style={{
              margin: "clamp(24px, 4vw, 36px) 0 0",
              fontSize: "clamp(32px, 4vw + 16px, 48px)",
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            The site could not load properly
          </h1>
          <p style={{ margin: "20px 0 0", maxWidth: "56ch", fontSize: 17, lineHeight: 1.55, color: MUTED }}>
            This is usually temporary. Please try again, or return to the home page.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ ...control, border: 0, background: ACCENT, color: CANVAS }}
            >
              Try again
            </button>
            <a href="/" style={{ ...control, border: `1px solid ${LINE_STRONG}`, background: "transparent", color: FG }}>
              Go to home
            </a>
          </div>
          <p style={{ margin: "40px 0 0", fontSize: 15, lineHeight: 1.6, color: MUTED }}>
            If it keeps happening, write to{" "}
            <a href="mailto:support@brightonsolution.com" style={{ color: FG, fontWeight: 600, wordBreak: "break-all" }}>
              support@brightonsolution.com
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
