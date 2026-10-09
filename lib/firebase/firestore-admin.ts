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
 * - updateDocument(collection, id, fields, idToken, mask?, { serverTimestamp? })
 *                                           Masked update via :commit (document must exist). Throws FirestoreError.
 * - deleteDocument(collection, id, idToken) Throws FirestoreError.
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

  const limit = Math.max(1, Math.min(5000, Math.floor(options.limit ?? 500)));
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

  const rows = (await response.json()) as RunQueryRow[];
  return rows
    .filter((row): row is RunQueryRow & { document: FirestoreDocument } => Boolean(row.document))
    .map((row) => decodeDocument<T>(row.document));
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
