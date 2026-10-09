/**
 * Minimal Firestore REST client for public pages (no SDK). Admin-only reads and updates live in
 * lib/firebase/firestore-admin.ts so they never ship in the public bundle.
 *
 * Exports
 * - encodeValue(v) / encodeFields(obj)      JS → Firestore typed values. Date → timestampValue, safe integers →
 *                                           integerValue, other numbers → doubleValue, nested objects/arrays supported,
 *                                           undefined fields are skipped (null in arrays).
 * - randomId(length = 20)                   [A-Za-z0-9] id from crypto.getRandomValues.
 * - createDocument(collection, data, { keepalive?, id? })
 *                                           :commit with createdAt = REQUEST_TIME and precondition exists:false.
 *                                           Never throws → { ok, id?, status? }. 10 s timeout unless keepalive.
 * - firestoreRequest(url, init, idToken?) / isValidSegment(s)
 *                                           Shared low-level helpers (also used by firestore-admin.ts).
 */

import { documentName, firestoreUrl } from "@/lib/firebase/config";

/* ------------------------------------------------------------------ types */

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { bytesValue: string }
  | { referenceValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export type FirestoreFields = Record<string, FirestoreValue>;

export type CreateResult = { ok: boolean; id?: string; status?: number };

/* --------------------------------------------------------------- encoding */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

export function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "bigint") return { integerValue: value.toString() };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    if (Number.isSafeInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? { nullValue: null } : { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeValue(item)) } };
  }
  if (isPlainObject(value)) {
    return { mapValue: { fields: encodeFields(value) } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(data: Record<string, unknown>): FirestoreFields {
  const fields: FirestoreFields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields[key] = encodeValue(value);
  }
  return fields;
}

/* -------------------------------------------------------------- utilities */

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomId(length = 20): string {
  const out: string[] = [];
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  // Rejection sampling keeps the distribution uniform (248 = 62 * 4).
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    if (cryptoObj?.getRandomValues) {
      cryptoObj.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    for (const byte of bytes) {
      if (byte < 248 && out.length < length) out.push(ID_ALPHABET[byte % 62]);
    }
  }
  return out.join("");
}

const TIMEOUT_MS = 10_000;

export async function firestoreRequest(
  url: string,
  init: RequestInit & { keepalive?: boolean },
  idToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const controller = !init.keepalive && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    return await fetch(url, {
      ...init,
      headers,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "strict-origin-when-cross-origin",
      signal: controller?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isValidSegment(segment: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(segment);
}

/* ------------------------------------------------------------ operations */

/**
 * Creates `collection/{id}` with `createdAt` set to the server time. Never throws.
 * `keepalive: true` lets the request outlive the page (use it from pagehide / visibilitychange).
 */
export async function createDocument(
  collection: string,
  data: Record<string, unknown>,
  options: { keepalive?: boolean; id?: string } = {},
): Promise<CreateResult> {
  try {
    const id = options.id && isValidSegment(options.id) ? options.id : randomId(20);
    if (!isValidSegment(collection)) return { ok: false };
    const { createdAt: _ignored, ...rest } = data;
    void _ignored;

    const body = {
      writes: [
        {
          update: { name: documentName(collection, id), fields: encodeFields(rest) },
          currentDocument: { exists: false },
          updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }],
        },
      ],
    };

    const response = await firestoreRequest(firestoreUrl(":commit"), {
      method: "POST",
      body: JSON.stringify(body),
      keepalive: options.keepalive === true,
    });
    return response.ok ? { ok: true, id, status: response.status } : { ok: false, status: response.status };
  } catch {
    return { ok: false };
  }
}
