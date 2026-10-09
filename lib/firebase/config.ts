/**
 * Firebase configuration (no SDK — plain REST over fetch).
 *
 * Exports
 * - firebaseConfig            { apiKey, projectId, appId, measurementId } from NEXT_PUBLIC_* env (inlined at build time)
 * - hasApiKey()               true when NEXT_PUBLIC_FIREBASE_API_KEY is set (required for Auth REST, optional for Firestore)
 * - FIRESTORE_BASE            https://firestore.googleapis.com/v1
 * - databasePath()            "projects/{projectId}/databases/(default)"
 * - documentName(col, id)     full resource name of a document
 * - firestoreUrl(suffix)      ".../databases/(default)/documents{suffix}" with ?key= appended when an API key exists
 * - withApiKey(url)           appends key=API_KEY to any URL when available
 * - ADMIN_EMAILS              e-mail addresses allowed into /admin (mirrors isAdmin() in firestore.rules)
 *
 * Env must be read with literal `process.env.NEXT_PUBLIC_*` so Next.js inlines it into the static export.
 */

export type FirebaseConfig = {
  apiKey: string;
  projectId: string;
  appId: string;
  measurementId: string;
};

export const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "brighton-web-ea63c",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

/** Must match the isAdmin() list in firestore.rules. */
export const ADMIN_EMAILS: readonly string[] = ["support@brightonsolution.com"];

export const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

export function hasApiKey(): boolean {
  return firebaseConfig.apiKey.trim().length > 0;
}

export function withApiKey(url: string): string {
  if (!hasApiKey()) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}key=${encodeURIComponent(firebaseConfig.apiKey)}`;
}

export function databasePath(): string {
  return `projects/${firebaseConfig.projectId}/databases/(default)`;
}

export function documentName(collection: string, id: string): string {
  return `${databasePath()}/documents/${collection}/${id}`;
}

/** `suffix` is appended directly after ".../documents", e.g. ":commit", ":runQuery", "/contacts/abc". */
export function firestoreUrl(suffix: string): string {
  return withApiKey(`${FIRESTORE_BASE}/${databasePath()}/documents${suffix}`);
}
