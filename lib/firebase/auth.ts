/**
 * Firebase Auth over REST (Identity Toolkit + Secure Token) for the /admin dashboard only.
 * Requires NEXT_PUBLIC_FIREBASE_API_KEY; every call returns a typed result and never throws.
 *
 * Exports
 * - signIn(email, password)          → AuthResult<AuthSession>   (email + password provider)
 * - refreshIdToken(refreshToken)     → AuthResult<AuthSession>   (new ID token; email/verified read from its claims)
 * - sendVerifyEmail(idToken)         → AuthResult<null>          (VERIFY_EMAIL)
 * - sendPasswordReset(email)         → AuthResult<null>          (PASSWORD_RESET; always reports success to avoid account enumeration)
 * - decodeIdToken(idToken)           → IdTokenClaims | null      (unverified decode, for UI decisions only — rules enforce access)
 * - isAdminSession(session)          → true when email is in ADMIN_EMAILS and verified
 * - Session helpers (sessionStorage "bs_admin_session", cleared when the tab closes):
 *   saveSession(s), loadSession(), clearSession(), getValidSession() (auto-refreshes within 5 min of expiry),
 *   getValidIdToken() → string | null
 */

import { ADMIN_EMAILS, firebaseConfig, hasApiKey } from "@/lib/firebase/config";

export type AuthSession = {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which idToken expires. */
  expiresAt: number;
};

export type AuthErrorCode =
  | "missing-api-key"
  | "invalid-credentials"
  | "too-many-attempts"
  | "user-disabled"
  | "invalid-email"
  | "token-expired"
  | "network"
  | "unknown";

export type AuthResult<T> = { ok: true; data: T } | { ok: false; code: AuthErrorCode; message: string };

export type IdTokenClaims = {
  sub?: string;
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  firebase?: { sign_in_provider?: string };
};

const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1";
const SECURE_TOKEN_URL = "https://securetoken.googleapis.com/v1/token";
const SESSION_KEY = "bs_admin_session";
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 15_000;

const messages: Record<AuthErrorCode, string> = {
  "missing-api-key":
    "Sign-in is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY and rebuild the site.",
  "invalid-credentials": "That email and password combination is not correct.",
  "too-many-attempts": "Too many attempts. Wait a few minutes, then try again.",
  "user-disabled": "This account has been disabled.",
  "invalid-email": "Enter a valid email address.",
  "token-expired": "Your session has expired. Please sign in again.",
  network: "The sign-in service could not be reached. Check your connection and try again.",
  unknown: "Sign-in failed. Please try again.",
};

function fail<T>(code: AuthErrorCode): AuthResult<T> {
  return { ok: false, code, message: messages[code] };
}

function mapError(raw: string | undefined): AuthErrorCode {
  const code = (raw ?? "").split(/[\s:]/)[0];
  switch (code) {
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
    case "EMAIL_NOT_FOUND":
    case "INVALID_IDP_RESPONSE":
      return "invalid-credentials";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "too-many-attempts";
    case "USER_DISABLED":
      return "user-disabled";
    case "INVALID_EMAIL":
    case "MISSING_EMAIL":
      return "invalid-email";
    case "TOKEN_EXPIRED":
    case "INVALID_REFRESH_TOKEN":
    case "INVALID_ID_TOKEN":
    case "USER_NOT_FOUND":
    case "CREDENTIAL_TOO_OLD_LOGIN_AGAIN":
      return "token-expired";
    case "API_KEY_INVALID":
    case "INVALID_API_KEY":
      return "missing-api-key";
    default:
      return "unknown";
  }
}

async function post(url: string, body: BodyInit, contentType: string): Promise<AuthResult<Record<string, unknown>>> {
  if (!hasApiKey()) return fail("missing-api-key");
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const sep = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${sep}key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      credentials: "omit",
      cache: "no-store",
      signal: controller?.signal,
    });
    let json: Record<string, unknown> = {};
    try {
      json = (await response.json()) as Record<string, unknown>;
    } catch {
      /* empty body */
    }
    if (!response.ok) {
      const error = json.error as { message?: string } | undefined;
      return fail(mapError(error?.message));
    }
    return { ok: true, data: json };
  } catch {
    return fail("network");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ tokens */

export function decodeIdToken(idToken: string): IdTokenClaims | null {
  try {
    const part = idToken.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as IdTokenClaims;
  } catch {
    return null;
  }
}

function sessionFrom(idToken: string, refreshToken: string, expiresIn: unknown, fallbackEmail = ""): AuthSession {
  const claims = decodeIdToken(idToken) ?? {};
  const seconds = Number(expiresIn);
  const expiresAt = claims.exp
    ? claims.exp * 1000
    : Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) * 1000;
  return {
    uid: claims.user_id ?? claims.sub ?? "",
    email: (claims.email ?? fallbackEmail).toLowerCase(),
    emailVerified: claims.email_verified === true,
    idToken,
    refreshToken,
    expiresAt,
  };
}

export function isAdminSession(session: AuthSession | null): boolean {
  return Boolean(session && session.emailVerified && ADMIN_EMAILS.includes(session.email.toLowerCase()));
}

/* --------------------------------------------------------------- endpoints */

export async function signIn(email: string, password: string): Promise<AuthResult<AuthSession>> {
  const trimmed = email.trim();
  if (!trimmed || !password) return fail("invalid-credentials");
  const result = await post(
    `${IDENTITY_BASE}/accounts:signInWithPassword`,
    JSON.stringify({ email: trimmed, password, returnSecureToken: true }),
    "application/json",
  );
  if (!result.ok) return result;
  const { idToken, refreshToken, expiresIn, email: returnedEmail } = result.data;
  if (typeof idToken !== "string" || typeof refreshToken !== "string") return fail("unknown");
  const session = sessionFrom(idToken, refreshToken, expiresIn, typeof returnedEmail === "string" ? returnedEmail : trimmed);
  saveSession(session);
  return { ok: true, data: session };
}

export async function refreshIdToken(refreshToken: string): Promise<AuthResult<AuthSession>> {
  if (!refreshToken) return fail("token-expired");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString();
  const result = await post(SECURE_TOKEN_URL, body, "application/x-www-form-urlencoded");
  if (!result.ok) return result;
  const { id_token: idToken, refresh_token: nextRefresh, expires_in: expiresIn } = result.data;
  if (typeof idToken !== "string") return fail("token-expired");
  const session = sessionFrom(idToken, typeof nextRefresh === "string" ? nextRefresh : refreshToken, expiresIn);
  saveSession(session);
  return { ok: true, data: session };
}

export async function sendVerifyEmail(idToken: string): Promise<AuthResult<null>> {
  const result = await post(
    `${IDENTITY_BASE}/accounts:sendOobCode`,
    JSON.stringify({ requestType: "VERIFY_EMAIL", idToken }),
    "application/json",
  );
  return result.ok ? { ok: true, data: null } : result;
}

export async function sendPasswordReset(email: string): Promise<AuthResult<null>> {
  const trimmed = email.trim();
  if (!trimmed) return fail("invalid-email");
  const result = await post(
    `${IDENTITY_BASE}/accounts:sendOobCode`,
    JSON.stringify({ requestType: "PASSWORD_RESET", email: trimmed }),
    "application/json",
  );
  if (result.ok) return { ok: true, data: null };
  // Do not reveal whether an account exists.
  if (result.code === "invalid-credentials" || result.code === "token-expired") return { ok: true, data: null };
  return result;
}

/* ----------------------------------------------------------------- session */

export function saveSession(session: AuthSession): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — session lives only in memory for this page */
  }
}

export function loadSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof parsed.idToken !== "string" || typeof parsed.refreshToken !== "string") return null;
    return {
      uid: String(parsed.uid ?? ""),
      email: String(parsed.email ?? ""),
      emailVerified: parsed.emailVerified === true,
      idToken: parsed.idToken,
      refreshToken: parsed.refreshToken,
      expiresAt: Number(parsed.expiresAt) || 0,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let refreshing: Promise<AuthSession | null> | null = null;

/** Returns a session whose ID token is valid for at least 5 more minutes, refreshing if needed; null when signed out. */
export async function getValidSession(): Promise<AuthSession | null> {
  const session = loadSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session;

  if (!refreshing) {
    refreshing = refreshIdToken(session.refreshToken)
      .then((result) => {
        if (result.ok) return result.data;
        if (result.code !== "network") clearSession();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function getValidIdToken(): Promise<string | null> {
  const session = await getValidSession();
  return session?.idToken ?? null;
}
