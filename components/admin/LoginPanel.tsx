"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { sendPasswordReset, signIn, type AuthSession } from "@/lib/firebase/auth";
import { Button, Notice, TextInput } from "@/components/admin/kit";

const LOCKOUT_AFTER = 5;
const LOCKOUT_MS = 30_000;

/**
 * Email + password sign-in for the admin (inside AdminDashboard's centred gate card).
 * Five failed attempts pause sign-in for 30 seconds; "Forgot password" never reveals whether an
 * account exists. Errors stay tied to the inputs through aria-describedby instead of stealing focus.
 */
export default function LoginPanel({
  onSignedIn,
  notice,
}: {
  onSignedIn: (session: AuthSession) => void;
  notice?: string | null;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const failures = useRef(0);
  const [, forceTick] = useState(0);

  const locked = lockedUntil > Date.now();

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setTimeout(() => {
      setLockedUntil(0);
      forceTick((n) => n + 1);
    }, Math.max(0, lockedUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [lockedUntil]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || locked) return;
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.ok) {
      failures.current = 0;
      setPassword("");
      onSignedIn(result.data);
      return;
    }
    failures.current += 1;
    if (failures.current >= LOCKOUT_AFTER) {
      failures.current = 0;
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setError("Too many failed attempts. Sign-in is paused for 30 seconds.");
      return;
    }
    setError(result.message);
  }

  async function forgot() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email address first, then choose “Forgot password”.");
      return;
    }
    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result.ok) setInfo("If that address has an account, a password reset email is on its way.");
    else setError(result.message);
  }

  return (
    <div>
      <h2 className="text-[1.0625rem] font-semibold text-fg">Sign in</h2>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">Use the administrator account to see enquiries and visits.</p>

      <div className="mt-5 space-y-3 empty:hidden">
        {notice ? <Notice>{notice}</Notice> : null}
        {info ? <Notice role="status" tone="success">{info}</Notice> : null}
        {error ? (
          <div id={`${id}-error`}>
            <Notice tone="error" role="alert">
              {error}
            </Notice>
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} noValidate className="mt-5 space-y-4" aria-busy={busy}>
        <div>
          <label htmlFor={`${id}-email`} className="mb-1.5 block text-[0.8125rem] font-medium text-fg">
            Email
          </label>
          <TextInput
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-h-12"
          />
        </div>
        <div>
          <label htmlFor={`${id}-password`} className="mb-1.5 block text-[0.8125rem] font-medium text-fg">
            Password
          </label>
          <div className="relative">
            <TextInput
              id={`${id}-password`}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              maxLength={4096}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="min-h-12 pr-[4.5rem]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              aria-controls={`${id}-password`}
              className="absolute right-1.5 top-1/2 inline-flex min-h-9 -translate-y-1/2 items-center rounded-[0.55rem] px-2.5 text-[0.8125rem] font-medium text-muted hover:bg-fg/[0.06] hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={locked}>
          {busy ? "Please wait…" : "Sign in"}
        </Button>
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => void forgot()} disabled={busy}>
            Forgot password?
          </Button>
        </div>
      </form>
    </div>
  );
}
