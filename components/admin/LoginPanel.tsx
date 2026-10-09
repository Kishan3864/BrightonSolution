"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { sendPasswordReset, signIn, type AuthSession } from "@/lib/firebase/auth";
import { AdminButton, Notice, inputClass, labelClass } from "@/components/admin/ui";

const LOCKOUT_AFTER = 5;
const LOCKOUT_MS = 30_000;

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
    <div className="max-w-[26rem]">
      <p className="mb-8 text-[0.9375rem] text-muted">Sign in with the administrator account to see visits and enquiries.</p>

      {/* One announcement per message: role="status"/"alert" on the notice itself, no extra live wrapper,
          and the error stays tied to the inputs through aria-describedby instead of stealing focus. */}
      <div className="space-y-3">
        {notice ? <Notice>{notice}</Notice> : null}
        {info ? <Notice role="status">{info}</Notice> : null}
        {error ? (
          <div id={`${id}-error`}>
            <Notice tone="error" role="alert">
              {error}
            </Notice>
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5" aria-busy={busy}>
        <div>
          <label htmlFor={`${id}-email`} className={labelClass}>
            Email
          </label>
          <input
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
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-password`} className={labelClass}>
            Password
          </label>
          <div className="flex gap-2">
            <input
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
              className={inputClass}
            />
            <AdminButton
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              aria-controls={`${id}-password`}
              className="shrink-0"
            >
              {showPassword ? "Hide" : "Show"}
            </AdminButton>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <AdminButton type="submit" variant="primary" disabled={busy || locked} className="min-w-[7.5rem]">
            {busy ? "Please wait…" : "Sign in"}
          </AdminButton>
          <AdminButton variant="ghost" onClick={() => void forgot()} disabled={busy}>
            Forgot password
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
