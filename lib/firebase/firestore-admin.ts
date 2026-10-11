/**
 * Admin-only Firestore REST helpers (no SDK). Imported only by components/admin/* so the public
 * bundle carries just createDocument from lib/firebase/firestore.ts.
 *
 * Exports
 * - decodeValue(v) / decodeFields(f) / decodeDocument(doc)
 *                                           Firestore → plain JS (timestamps become Date, integers become number,
 *                                           decodeDocument adds `id` from the resource name).
 * - runQuery(collection, { since?, until?, limit?, direction? }, idToken)
 *                                           Authenticated structured query ordered by createdAt. Throws FirestoreError.
 * - queryWhereEquals(collection, field, value, idToken, limit = 1000)
 *                                           Documents whose `field` equals the string `value` (one equality filter,
 *                                           no orderBy, so Firestore's automatic single-field index serves it).
 *                                           Unordered; the caller sorts. Max 5000. Throws FirestoreError.
 * - getDocument(collection, id, idToken)    One document, or null when it does not exist. Throws FirestoreError.
 * - setDocument(collection, id, fields, idToken, { serverTimestamp? })
 *                                           Create-or-replace via :commit (no precondition; the whole document is
 *                                           replaced). Throws FirestoreError.
 * - updateDocument(collection, id, fields, idToken, mask?, { serverTimestamp? })
 *                                           Masked update via :commit (document must exist). Throws FirestoreError.
 * - deleteDocument(collection, id, idToken) Throws FirestoreError.
 * - deleteDocuments(collection, ids, idToken)
 *                                           Deletes in batched :commit calls of up to 500. Throws FirestoreError.
 * - purgeOlderThan(collection, cutoff, idToken, max?)
 *                                           Retention clean-up: deletes up to `max` documents created before `cutoff`,
 *                                           oldest first. Returns the number deleted. Throws FirestoreError.
 * - FirestoreError                          Error with HTTP `status` and Firestore `code` (e.g. PERMISSION_DENIED).
 */

import { documentName, firestoreUrl } from "@/lib/firebase/config";
import {
  encodeFields,
  firestoreRequest,
  isValidSegment,
  type FirestoreFields,
  type FirestoreValue,
} from "@/lib/firebase/firestore";

/* ------------------------------------------------------------------ types */

export type FirestoreDocument = {
  name: string;
  fields?: FirestoreFields;
  createTime?: string;
  updateTime?: string;
};

export type DecodedDocument<T = Record<string, unknown>> = T & { id: string };

export type QueryOptions = {
  /** Only documents with createdAt >= since. */
  since?: Date;
  /** Only documents with createdAt < until. */
  until?: Date;
  /** Max documents (default 500, capped at 5000). */
  limit?: number;
  /** Sort by createdAt (default DESCENDING). */
  direction?: "ASCENDING" | "DESCENDING";
};

export class FirestoreError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "UNKNOWN") {
    super(message);
    this.name = "FirestoreError";
    this.status = status;
    this.code = code;
  }
}

/* --------------------------------------------------------------- decoding */

export function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return { ...value.geoPointValue };
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map((item) => decodeValue(item));
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}

export function decodeFields(fields: FirestoreFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
  return out;
}

export function decodeDocument<T = Record<string, unknown>>(doc: FirestoreDocument): DecodedDocument<T> {
  const id = doc.name.slice(doc.name.lastIndexOf("/") + 1);
  return { ...(decodeFields(doc.fields ?? {}) as T), id };
}

async function toError(response: Response): Promise<FirestoreError> {
  let message = `Firestore request failed (${response.status})`;
  let code = "UNKNOWN";
  try {
    const body = (await response.json()) as { error?: { message?: string; status?: string } };
    if (body.error?.message) message = body.error.message;
    if (body.error?.status) code = body.error.status;
  } catch {
    /* non-JSON error body */
  }
  return new FirestoreError(message, response.status, code);
}

/* ------------------------------------------------------------ operations */

type RunQueryRow = { document?: FirestoreDocument; readTime?: string };

async function decodeRows<T>(response: Response): Promise<DecodedDocument<T>[]> {
  const rows = (await response.json()) as RunQueryRow[];
  return rows
    .filter((row): row is RunQueryRow & { document: FirestoreDocument } => Boolean(row.document))
    .map((row) => decodeDocument<T>(row.document));
}

/** Top-level field names only (no dots or quoting), e.g. "visitorId", "sessionId", "email". */
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/;

/** Whole number in 1..5000 (Firestore REST serves at most 5000 results per query here). */
function clampLimit(limit: number | undefined, fallback: number): number {
  const value = typeof limit === "number" && Number.isFinite(limit) ? Math.floor(limit) : fallback;
  return Math.max(1, Math.min(5000, value));
}

/** Admin read. Requires a Firebase ID token that satisfies isAdmin() in firestore.rules. */
export async function runQuery<T = Record<string, unknown>>(
  collection: string,
  options: QueryOptions,
  idToken: string,
): Promise<DecodedDocument<T>[]> {
  const filters: unknown[] = [];
  if (options.since) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "createdAt" },
        op: "GREATER_THAN_OR_EQUAL",
        value: { timestampValue: options.since.toISOString() },
      },
    });
  }
  if (options.until) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "createdAt" },
        op: "LESS_THAN",
        value: { timestampValue: options.until.toISOString() },
      },
    });
  }

  const limit = clampLimit(options.limit, 500);
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: collection }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: options.direction ?? "DESCENDING" }],
    limit,
  };
  if (filters.length === 1) structuredQuery.where = filters[0];
  if (filters.length > 1) structuredQuery.where = { compositeFilter: { op: "AND", filters } };

  const response = await firestoreRequest(
    firestoreUrl(":runQuery"),
    { method: "POST", body: JSON.stringify({ structuredQuery }) },
    idToken,
  );
  if (!response.ok) throw await toError(response);

  return decodeRows<T>(response);
}

/**
 * Admin read of every document whose `field` equals `value` (e.g. all page views of one visitor).
 * A single equality filter with no orderBy needs only Firestore's automatic single-field index, so
 * no composite index has to be deployed. Results come back in document-id order, not by time: the
 * caller sorts. When the result length equals `limit` there may be more matches (default 1000, max
 * 5000). Each returned document costs one read; a query with no match costs one read.
 */
export async function queryWhereEquals<T = Record<string, unknown>>(
  collection: string,
  field: string,
  value: string,
  idToken: string,
  limit = 1000,
): Promise<DecodedDocument<T>[]> {
  if (!isValidSegment(collection) || !FIELD_NAME.test(field)) {
    throw new FirestoreError("Invalid collection or field name", 400, "INVALID_ARGUMENT");
  }
  const structuredQuery = {
    from: [{ collectionId: collection }],
    where: {
      fieldFilter: {
        field: { fieldPath: field },
        op: "EQUAL",
        value: { stringValue: String(value) },
      },
    },
    limit: clampLimit(limit, 1000),
  };

  const response = await firestoreRequest(
    firestoreUrl(":runQuery"),
    { method: "POST", body: JSON.stringify({ structuredQuery }) },
    idToken,
  );
  if (!response.ok) throw await toError(response);
  return decodeRows<T>(response);
}

/** Admin read of one document; null when it does not exist (HTTP 404). */
export async function getDocument<T = Record<string, unknown>>(
  collection: string,
  id: string,
  idToken: string,
): Promise<DecodedDocument<T> | null> {
  if (!isValidSegment(collection) || !isValidSegment(id)) {
    throw new FirestoreError("Invalid document path", 400, "INVALID_ARGUMENT");
  }
  const response = await firestoreRequest(firestoreUrl(`/${collection}/${id}`), { method: "GET" }, idToken);
  if (response.status === 404) return null;
  if (!response.ok) throw await toError(response);
  return decodeDocument<T>((await response.json()) as FirestoreDocument);
}

/**
 * Creates the document or replaces it entirely (no precondition, no update mask: fields that are not
 * in `fields` are removed). `serverTimestamp: "updatedAt"` also sets that field to the server time
 * (REQUEST_TIME), which is what the rules for settings/dashboard expect.
 */
export async function setDocument(
  collection: string,
  id: string,
  fields: Record<string, unknown>,
  idToken: string,
  options: { serverTimestamp?: string } = {},
): Promise<void> {
  if (!isValidSegment(collection) || !isValidSegment(id)) {
    throw new FirestoreError("Invalid document path", 400, "INVALID_ARGUMENT");
  }
  const stamp = options.serverTimestamp;
  if (stamp !== undefined && !FIELD_NAME.test(stamp)) {
    throw new FirestoreError("Invalid timestamp field name", 400, "INVALID_ARGUMENT");
  }
  const data: Record<string, unknown> = { ...fields };
  if (stamp) delete data[stamp];

  const write: Record<string, unknown> = {
    update: { name: documentName(collection, id), fields: encodeFields(data) },
  };
  if (stamp) write.updateTransforms = [{ fieldPath: stamp, setToServerValue: "REQUEST_TIME" }];

  const response = await firestoreRequest(
    firestoreUrl(":commit"),
    { method: "POST", body: JSON.stringify({ writes: [write] }) },
    idToken,
  );
  if (!response.ok) throw await toError(response);
}

/**
 * Updates only the masked fields of an existing document (default mask = keys of `fields`).
 * `serverTimestamp: "updatedAt"` additionally sets that field to the server time.
 */
export async function updateDocument(
  collection: string,
  id: string,
  fields: Record<string, unknown>,
  idToken: string,
  mask: string[] = Object.keys(fields),
  options: { serverTimestamp?: string } = {},
): Promise<void> {
  if (!isValidSegment(collection) || !isValidSegment(id)) {
    throw new FirestoreError("Invalid document path", 400, "INVALID_ARGUMENT");
  }
  const write: Record<string, unknown> = {
    update: { name: documentName(collection, id), fields: encodeFields(fields) },
    updateMask: { fieldPaths: mask.filter((path) => path !== options.serverTimestamp) },
    currentDocument: { exists: true },
  };
  if (options.serverTimestamp) {
    write.updateTransforms = [{ fieldPath: options.serverTimestamp, setToServerValue: "REQUEST_TIME" }];
  }

  const response = await firestoreRequest(
    firestoreUrl(":commit"),
    { method: "POST", body: JSON.stringify({ writes: [write] }) },
    idToken,
  );
  if (!response.ok) throw await toError(response);
}

export async function deleteDocument(collection: string, id: string, idToken: string): Promise<void> {
  if (!isValidSegment(collection) || !isValidSegment(id)) {
    throw new FirestoreError("Invalid document path", 400, "INVALID_ARGUMENT");
  }
  const response = await firestoreRequest(firestoreUrl(`/${collection}/${id}`), { method: "DELETE" }, idToken);
  if (!response.ok) throw await toError(response);
}

/** Deletes documents in batched :commit calls (Firestore accepts up to 500 writes per commit). */
export async function deleteDocuments(collection: string, ids: string[], idToken: string): Promise<void> {
  if (!isValidSegment(collection) || ids.some((id) => !isValidSegment(id))) {
    throw new FirestoreError("Invalid document path", 400, "INVALID_ARGUMENT");
  }
  for (let start = 0; start < ids.length; start += 500) {
    const writes = ids.slice(start, start + 500).map((id) => ({ delete: documentName(collection, id) }));
    const response = await firestoreRequest(
      firestoreUrl(":commit"),
      { method: "POST", body: JSON.stringify({ writes }) },
      idToken,
    );
    if (!response.ok) throw await toError(response);
  }
}

/**
 * Retention clean-up for analytics collections. Finds documents whose createdAt is before `cutoff`
 * (oldest first, at most `max`), re-checks each one's createdAt against the cutoff, and deletes only
 * those. Documents without a readable createdAt are never deleted. Returns how many were deleted.
 */
export async function purgeOlderThan(collection: string, cutoff: Date, idToken: string, max = 500): Promise<number> {
  const cutoffMs = cutoff.getTime();
  if (!Number.isFinite(cutoffMs)) return 0;
  const candidates = await runQuery<{ createdAt?: unknown }>(
    collection,
    { until: cutoff, limit: max, direction: "ASCENDING" },
    idToken,
  );
  const expired = candidates
    .filter((doc) => doc.createdAt instanceof Date && doc.createdAt.getTime() < cutoffMs)
    .map((doc) => doc.id);
  if (expired.length === 0) return 0;
  await deleteDocuments(collection, expired, idToken);
  return expired.length;
}
