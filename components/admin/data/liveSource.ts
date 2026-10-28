import { COLLECTIONS, RETENTION_DAYS, SETTINGS_DOC_ID } from "@/lib/firebase/schema";
import {
  FirestoreError,
  getDocument,
  purgeOlderThan,
  queryWhereEquals,
  runQuery,
  setDocument,
  updateDocument,
} from "@/lib/firebase/firestore-admin";
import { SessionExpiredError, type AdminSource, type ContactDoc, type EventDoc, type LeadDoc, type PageviewDoc, type SettingsState } from "./types";

/**
 * Firestore-backed AdminSource (REST with the admin's ID token; access is enforced by firestore.rules).
 * Keeps the old dashboard's behaviour: paged newest-first reads, retention purge, masked updates with
 * a server updatedAt, and the status sent along with a note because the rules check it on every update.
 */

const PAGE_SIZE = 5000;
const POLL_LIMIT = 100;
const JOURNEY_LIMIT = 2000;
const DAY_MS = 86_400_000;

/**
 * Reads up to `max` documents newest-first, paging by createdAt (Firestore REST caps one query at 5000).
 * Decoded timestamps keep only milliseconds while REQUEST_TIME has microseconds, so each next page ends
 * 1 ms after the oldest document seen and already-seen ids are skipped: nothing on a boundary is lost.
 */
export async function fetchAll<T>(collection: string, since: Date, until: Date | undefined, max: number, token: string) {
  const docs: T[] = [];
  const seen = new Set<string>();
  let end = until;
  while (docs.length < max) {
    const limit = Math.min(PAGE_SIZE, max - docs.length);
    const page = await runQuery<T & { createdAt?: Date }>(collection, { since, until: end, limit }, token);
    let added = 0;
    for (const doc of page) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      docs.push(doc as T);
      added += 1;
    }
    if (page.length < limit) return { docs, truncated: false };
    // A page with no new ids means more than one page of documents share a millisecond: stop safely.
    if (added === 0) return { docs, truncated: true };
    const oldest = page[page.length - 1]?.createdAt;
    if (!(oldest instanceof Date)) return { docs, truncated: true };
    end = new Date(oldest.getTime() + 1);
  }
  return { docs, truncated: true };
}

/** User-facing message for a failed request; `expired` means the session must end. */
export function describeError(error: unknown): { message: string; expired: boolean } {
  if (error instanceof SessionExpiredError) return { message: error.message, expired: true };
  if (error instanceof FirestoreError) {
    if (error.status === 401 || error.code === "UNAUTHENTICATED") {
      return { message: "Your session has expired. Please sign in again.", expired: true };
    }
    if (error.status === 403 || error.code === "PERMISSION_DENIED") {
      return {
        message:
          "This account is not an authorised admin. Firestore only admits support@brightonsolution.com with a verified email, signed in with a password, and the rules in firestore.rules must be deployed.",
        expired: false,
      };
    }
    if (error.code === "FAILED_PRECONDITION") {
      return { message: `Firestore needs an index or the database is not ready: ${error.message}`, expired: false };
    }
    if (error.status === 404 || error.code === "NOT_FOUND") {
      return {
        message: "The Firestore database was not found. Create it in the Firebase console (Firestore Database → Create database).",
        expired: false,
      };
    }
    return { message: error.message || "Firestore returned an error.", expired: false };
  }
  return { message: "Firestore could not be reached. Check your connection and try again.", expired: false };
}

export function createLiveSource(getToken: () => Promise<string | null>): AdminSource {
  const token = async () => {
    const value = await getToken();
    if (!value) throw new SessionExpiredError();
    return value;
  };

  return {
    mode: "live",
    pollMs: 60_000,

    async loadInbox(limit) {
      const t = await token();
      const [contacts, leads] = await Promise.all([
        runQuery<ContactDoc>(COLLECTIONS.contacts, { limit }, t),
        runQuery<LeadDoc>(COLLECTIONS.leads, { limit }, t),
      ]);
      return { contacts, leads };
    },

    async loadAnalytics(since, until, max) {
      const t = await token();
      const [pageviews, events] = await Promise.all([
        fetchAll<PageviewDoc>(COLLECTIONS.pageviews, since, until, max, t),
        fetchAll<EventDoc>(COLLECTIONS.events, since, until, max, t),
      ]);
      return { pageviews: pageviews.docs, events: events.docs, pageviewsTruncated: pageviews.truncated, eventsTruncated: events.truncated };
    },

    async loadSettings(): Promise<SettingsState | null> {
      const t = await token();
      const doc = await getDocument<{ excludedVisitors?: unknown; updatedAt?: unknown }>(COLLECTIONS.settings, SETTINGS_DOC_ID, t);
      if (!doc) return null;
      const list = Array.isArray(doc.excludedVisitors) ? doc.excludedVisitors.filter((v): v is string => typeof v === "string") : [];
      return { excludedVisitors: list, updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : null };
    },

    async pollNew(contactsSince, leadsSince) {
      const t = await token();
      const [contacts, leads] = await Promise.all([
        runQuery<ContactDoc>(COLLECTIONS.contacts, { since: contactsSince ?? undefined, limit: POLL_LIMIT }, t),
        runQuery<LeadDoc>(COLLECTIONS.leads, { since: leadsSince ?? undefined, limit: POLL_LIMIT }, t),
      ]);
      return { contacts, leads };
    },

    async updateContact(id, fields) {
      const t = await token();
      const mask = fields.note === undefined ? ["status"] : ["status", "note"];
      await updateDocument(COLLECTIONS.contacts, id, fields, t, mask, { serverTimestamp: "updatedAt" });
    },

    async updateLead(id, fields) {
      const t = await token();
      const mask = fields.note === undefined ? ["status"] : ["note", "status"];
      await updateDocument(COLLECTIONS.leads, id, fields, t, mask, { serverTimestamp: "updatedAt" });
    },

    async saveSettings(excludedVisitors) {
      const t = await token();
      await setDocument(COLLECTIONS.settings, SETTINGS_DOC_ID, { excludedVisitors }, t, { serverTimestamp: "updatedAt" });
    },

    async purge() {
      const t = await token();
      const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
      const [a, b] = await Promise.all([
        purgeOlderThan(COLLECTIONS.pageviews, cutoff, t),
        purgeOlderThan(COLLECTIONS.events, cutoff, t),
      ]);
      return a + b;
    },

    async journeyDocs(visitorId) {
      const t = await token();
      const [pageviews, events, contacts] = await Promise.all([
        queryWhereEquals<PageviewDoc>(COLLECTIONS.pageviews, "visitorId", visitorId, t, JOURNEY_LIMIT),
        queryWhereEquals<EventDoc>(COLLECTIONS.events, "visitorId", visitorId, t, JOURNEY_LIMIT),
        queryWhereEquals<ContactDoc>(COLLECTIONS.contacts, "visitorId", visitorId, t, 100),
      ]);
      return { pageviews, events, contacts };
    },
  };
}
