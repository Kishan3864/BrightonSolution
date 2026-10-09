"use client";

import { useCallback, useEffect, useState } from "react";
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
import Dashboard from "@/components/admin/Dashboard";
import LoginPanel from "@/components/admin/LoginPanel";
import { AdminButton, Notice } from "@/components/admin/ui";

type Phase =
  | { kind: "booting" }
  | { kind: "signed-out"; notice: string | null }
  | { kind: "signed-in"; session: AuthSession };

const SESSION_CHECK_MS = 60_000;

/**
 * /admin client shell: configuration check → sign-in → email verification → dashboard.
 * Access to data is enforced by firestore.rules (verified admin email, password provider);
 * this UI only decides what to show. No request for data is made without a valid ID token.
 */
export default function AdminDashboard() {
  const [phase, setPhase] = useState<Phase>({ kind: "booting" });
  const configured = hasApiKey();

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

  // Keep the ID token fresh while the dashboard is open.
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

  const getToken = useCallback(async () => getValidIdToken(), []);

  return (
    <div className="min-w-0">
      <div className="mb-10 flex flex-col gap-3">
        <p className="eyebrow text-muted">Private · not indexed</p>
        <h1 className="text-h1">Site analytics</h1>
      </div>

      {!configured ? (
        <SetupNotice />
      ) : phase.kind === "booting" ? (
        <p className="text-[0.875rem] text-muted" role="status">
          Checking session…
        </p>
      ) : phase.kind === "signed-out" ? (
        <LoginPanel notice={phase.notice} onSignedIn={(session) => setPhase({ kind: "signed-in", session })} />
      ) : !ADMIN_EMAILS.includes(phase.session.email.toLowerCase()) ? (
        <NotAuthorised email={phase.session.email} onSignOut={signOut} />
      ) : !phase.session.emailVerified ? (
        <VerifyEmail
          session={phase.session}
          onVerified={(session) => setPhase({ kind: "signed-in", session })}
          onExpired={expire}
          onSignOut={signOut}
        />
      ) : (
        <Dashboard email={phase.session.email} getToken={getToken} onExpired={expire} onSignOut={signOut} />
      )}
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="max-w-[42rem] space-y-4">
      <Notice title="Sign-in is not configured">
        <p>
          The dashboard needs the Firebase web API key at build time. Add it to <code>.env.local</code> and rebuild:
        </p>
        <pre className="mt-3 overflow-x-auto border border-line bg-paper p-3 font-mono text-[0.75rem] text-ink">
          NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
        </pre>
      </Notice>
      <ol className="list-decimal space-y-2 pl-5 text-[0.875rem] text-muted">
        <li>
          Firebase console → project <code className="font-mono text-ink">{firebaseConfig.projectId}</code> → Firestore
          Database → Create database → keep the database ID <code className="font-mono text-ink">(default)</code> →
          choose a location → Start in <strong className="font-medium text-ink">production mode</strong>. Never test
          mode: it leaves every enquiry publicly readable. Then run{" "}
          <code className="font-mono text-ink">firebase deploy --only firestore</code> (rules and TTL policies) before
          any build that writes to it goes live.
        </li>
        <li>
          Project settings → Your apps → add a Web app and copy its <code className="font-mono text-ink">apiKey</code>.
        </li>
        <li>Authentication → Sign-in method → enable Email/Password.</li>
        <li>Immediately after: Authentication → Settings → User actions → untick “Enable create (sign-up)”.</li>
        <li>
          Only then: Authentication → Users → Add user <code className="font-mono text-ink">{ADMIN_EMAILS[0]}</code> (Add
          user in the console still works with sign-up disabled). Sign in on this page and send the verification email
          from here.{" "}
          <strong className="font-medium text-ink">
            Never click a verification email you did not request from this page yourself.
          </strong>
        </li>
        <li>
          Firestore → TTL policies: check that <code className="font-mono text-ink">pageviews.expireAt</code> and{" "}
          <code className="font-mono text-ink">events.expireAt</code> are listed, so records are deleted after about 26
          months.
        </li>
        <li>
          Google Cloud console → APIs &amp; Services → Credentials → the browser key: restrict it to HTTP referrers (your
          domain, <code className="font-mono text-ink">{firebaseConfig.projectId}.web.app</code> and{" "}
          <code className="font-mono text-ink">{firebaseConfig.projectId}.firebaseapp.com</code>) and to the Identity
          Toolkit, Token Service and Cloud Firestore APIs.
        </li>
        <li>Billing → Budgets &amp; alerts: set a low monthly budget alert for the project.</li>
      </ol>
    </div>
  );
}

function NotAuthorised({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="max-w-[36rem] space-y-5">
      <Notice tone="error" title="This account is not an authorised admin" role="alert">
        <span className="break-all">{email}</span> can sign in, but the database rules do not allow it to read analytics or
        enquiries.
      </Notice>
      <AdminButton variant="primary" onClick={onSignOut}>
        Sign out
      </AdminButton>
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
    <div className="max-w-[36rem] space-y-5">
      <Notice title="Verify the admin email address">
        The database rules only admit a verified admin email. Send a verification email to{" "}
        <span className="break-all text-ink">{session.email}</span>, open the link it contains, then check again.
      </Notice>
      <div aria-live="polite">
        {message ? (
          <Notice tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </Notice>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="primary" onClick={() => void send()} disabled={busy}>
          Send verification email
        </AdminButton>
        <AdminButton onClick={() => void recheck()} disabled={busy}>
          I have verified
        </AdminButton>
        <AdminButton variant="ghost" onClick={onSignOut}>
          Sign out
        </AdminButton>
      </div>
    </div>
  );
}
