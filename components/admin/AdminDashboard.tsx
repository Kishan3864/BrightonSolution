"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { ADMIN_EMAILS, firebaseConfig, hasApiKey } from "@/lib/firebase/config";
import {
  clearSession,
  getValidIdToken,
  getValidSession,
  loadSession,
  refreshIdToken,
  sendVerifyEmail,
  type AuthSession,
} from "@/lib/firebase/auth";
import LoginPanel from "@/components/admin/LoginPanel";
import AdminApp from "@/components/admin/shell/AdminApp";
import { Button, Notice } from "@/components/admin/kit";
import { createLiveSource } from "@/components/admin/data/liveSource";
import { captureInstallPrompt } from "@/components/admin/data/push";
import type { AdminSource } from "@/components/admin/data/types";

type Phase =
  | { kind: "booting" }
  | { kind: "signed-out"; notice: string | null }
  | { kind: "signed-in"; session: AuthSession };

const SESSION_CHECK_MS = 60_000;

/**
 * Admin entry: configuration check -> sign-in -> email verification -> <AdminApp/>.
 * Access to data is enforced by firestore.rules (verified admin email, password provider); this UI
 * only decides what to show. No request for data is made without a valid ID token.
 * The gate screens are a centred, full-screen app sign-in (the public header is hidden on admin paths).
 *
 * Dev-only design preview: under `next dev`, /admin?demo=1 skips sign-in and runs the app on
 * generated sample data (components/admin/data/demo.ts, loaded by a dynamic import inside the
 * NODE_ENV guard, so production builds never contain it or the bypass).
 */
export default function AdminDashboard() {
  const [phase, setPhase] = useState<Phase>({ kind: "booting" });
  const [demo, setDemo] = useState<AdminSource | null>(null);
  const [demoChecked, setDemoChecked] = useState(process.env.NODE_ENV !== "development");
  const configured = hasApiKey();

  // Chrome offers installing the app once per page load, often before sign-in: keep that offer.
  useEffect(() => captureInstallPrompt(), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const wanted = new URLSearchParams(window.location.search).get("demo") === "1";
    if (!wanted) {
      setDemoChecked(true);
      return;
    }
    let cancelled = false;
    void import("@/components/admin/data/demo").then((mod) => {
      if (cancelled) return;
      setDemo(mod.createDemoSource());
      setDemoChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void getValidSession().then((session) => {
      if (cancelled) return;
      setPhase(session ? { kind: "signed-in", session } : { kind: "signed-out", notice: null });
    });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const expire = useCallback(() => {
    clearSession();
    setPhase({ kind: "signed-out", notice: "Your session has expired. Please sign in again." });
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setPhase({ kind: "signed-out", notice: "You have been signed out." });
  }, []);

  // Keep the ID token fresh while the app is open.
  useEffect(() => {
    if (phase.kind !== "signed-in") return;
    const timer = window.setInterval(() => {
      void getValidSession().then((session) => {
        if (session) return;
        // A network hiccup keeps the stored session; only a rejected refresh signs out.
        if (!loadSession()) expire();
      });
    }, SESSION_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [phase.kind, expire]);

  const live = useMemo(() => createLiveSource(() => getValidIdToken()), []);

  if (!demoChecked) return <GateFrame><Booting /></GateFrame>;

  // The NODE_ENV test lets production builds drop this branch entirely.
  if (process.env.NODE_ENV === "development" && demo) {
    return <AdminApp source={demo} email="demo@brightonsolution.com" onExpired={() => window.location.reload()} onSignOut={() => window.location.assign(window.location.pathname)} />;
  }

  if (configured && phase.kind === "signed-in" && ADMIN_EMAILS.includes(phase.session.email.toLowerCase()) && phase.session.emailVerified) {
    return <AdminApp source={live} email={phase.session.email} onExpired={expire} onSignOut={signOut} />;
  }

  return (
    <GateFrame wide={!configured}>
      {!configured ? (
        <SetupNotice />
      ) : phase.kind === "booting" ? (
        <Booting />
      ) : phase.kind === "signed-out" ? (
        <LoginPanel notice={phase.notice} onSignedIn={(session) => setPhase({ kind: "signed-in", session })} />
      ) : !ADMIN_EMAILS.includes(phase.session.email.toLowerCase()) ? (
        <NotAuthorised email={phase.session.email} onSignOut={signOut} />
      ) : (
        <VerifyEmail
          session={phase.session}
          onVerified={(session) => setPhase({ kind: "signed-in", session })}
          onExpired={expire}
          onSignOut={signOut}
        />
      )}
    </GateFrame>
  );
}

/** Full-screen centred frame for the sign-in steps: logo, product name, one card. */
function GateFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-contain bg-canvas">
      {/* One soft sunrise glow: the brand's only gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-[-18rem] size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(237,148,59,0.16),rgba(237,180,59,0.05)_55%,transparent_75%)]"
      />
      <div className="relative flex min-h-full flex-col items-center justify-center px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
        <div className={wide ? "w-full max-w-[40rem]" : "w-full max-w-[26rem]"}>
          <div className="mb-7 flex flex-col items-center text-center">
            <LogoMark className="size-12" />
            <h1 className="mt-4 font-display text-[1.625rem] font-medium leading-tight tracking-[-0.03em] text-fg">BrightonSolution Admin</h1>
            <p className="mt-1 text-[0.875rem] text-muted">Enquiries, leads and site analytics</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-7">{children}</div>
          <p className="mt-6 text-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted">Private · not indexed</p>
        </div>
      </div>
    </div>
  );
}

function Booting() {
  return (
    <p className="flex items-center justify-center gap-3 py-6 text-[0.875rem] text-muted" role="status">
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      Checking session…
    </p>
  );
}

function SetupNotice() {
  return (
    <div className="space-y-4">
      <Notice title="Sign-in is not configured">
        <p>
          The dashboard needs the Firebase web API key at build time. Add it to <code>.env.local</code> and rebuild:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-sharp border border-line bg-canvas p-3 font-mono text-[0.75rem] text-fg">
          NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
        </pre>
      </Notice>
      <ol className="list-decimal space-y-2 pl-5 text-[0.875rem] leading-relaxed text-muted">
        <li>
          Firebase console → project <code className="font-mono text-fg">{firebaseConfig.projectId}</code> → Firestore
          Database → Create database → keep the database ID <code className="font-mono text-fg">(default)</code> →
          choose a location → Start in <strong className="font-medium text-fg">production mode</strong>. Never test
          mode: it leaves every enquiry publicly readable. Then run{" "}
          <code className="font-mono text-fg">firebase deploy --only firestore</code> (security rules) before
          any build that writes to it goes live.
        </li>
        <li>
          Project settings → Your apps → add a Web app and copy its <code className="font-mono text-fg">apiKey</code>.
        </li>
        <li>Authentication → Sign-in method → enable Email/Password.</li>
        <li>Immediately after: Authentication → Settings → User actions → untick “Enable create (sign-up)”.</li>
        <li>
          Only then: Authentication → Users → Add user <code className="font-mono text-fg">{ADMIN_EMAILS[0]}</code> (Add
          user in the console still works with sign-up disabled). Sign in on this page and send the verification email
          from here.{" "}
          <strong className="font-medium text-fg">
            Never click a verification email you did not request from this page yourself.
          </strong>
        </li>
        <li>
          Open this dashboard at least once a month: each visit deletes page views and clicks older than about 26
          months, as the privacy policy states.
        </li>
        <li>
          Google Cloud console → APIs &amp; Services → Credentials → the browser key: restrict it to HTTP referrers (your
          domain, <code className="font-mono text-fg">{firebaseConfig.projectId}.web.app</code> and{" "}
          <code className="font-mono text-fg">{firebaseConfig.projectId}.firebaseapp.com</code>) and to the Identity
          Toolkit, Token Service and Cloud Firestore APIs.
        </li>
        <li>Billing → Budgets &amp; alerts: set a low monthly budget alert for the project.</li>
      </ol>
      {process.env.NODE_ENV === "development" ? (
        <p className="text-[0.8125rem] text-muted">
          Developing? Open <a className="text-accent underline-offset-4 hover:underline" href="?demo=1">/admin?demo=1</a> to preview the app with sample data.
        </p>
      ) : null}
    </div>
  );
}

function NotAuthorised({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="space-y-5">
      <Notice tone="error" title="This account is not an authorised admin" role="alert">
        <span className="break-all">{email}</span> can sign in, but the database rules do not allow it to read analytics or
        enquiries.
      </Notice>
      <Button variant="primary" block size="lg" onClick={onSignOut} icon="logOut">
        Sign out
      </Button>
    </div>
  );
}

function VerifyEmail({
  session,
  onVerified,
  onExpired,
  onSignOut,
}: {
  session: AuthSession;
  onVerified: (session: AuthSession) => void;
  onExpired: () => void;
  onSignOut: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "neutral" | "error"; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMessage(null);
    const token = await getValidIdToken();
    if (!token) {
      setBusy(false);
      onExpired();
      return;
    }
    const result = await sendVerifyEmail(token);
    setBusy(false);
    setMessage(
      result.ok
        ? { tone: "neutral", text: `Verification email sent to ${session.email}. Open the link, then choose “I have verified”.` }
        : { tone: "error", text: result.message },
    );
  }

  async function recheck() {
    setBusy(true);
    setMessage(null);
    const current = loadSession() ?? session;
    const result = await refreshIdToken(current.refreshToken);
    setBusy(false);
    if (!result.ok) {
      if (result.code === "token-expired") onExpired();
      else setMessage({ tone: "error", text: result.message });
      return;
    }
    if (result.data.emailVerified) onVerified(result.data);
    else setMessage({ tone: "error", text: "This address is still not verified. Open the link in the verification email first." });
  }

  return (
    <div className="space-y-5">
      <Notice title="Verify the admin email address">
        The database rules only admit a verified admin email. Send a verification email to{" "}
        <span className="break-all text-fg">{session.email}</span>, open the link it contains, then check again.
      </Notice>
      <div aria-live="polite">
        {message ? (
          <Notice tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </Notice>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Button variant="primary" size="lg" block onClick={() => void send()} disabled={busy} icon="send">
          Send verification email
        </Button>
        <Button size="lg" block onClick={() => void recheck()} disabled={busy} icon="check">
          I have verified
        </Button>
        <Button variant="ghost" block onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
