import type { ContactDoc, EventDoc, PageviewDoc, WithMeta } from "@/lib/analytics/report";
import type { ContactStatus, LeadRecord, LeadStatus } from "@/lib/firebase/schema";

/** Shared admin data types. Documents are decoded Firestore records (lib/firebase/firestore-admin). */

export type { ContactDoc, EventDoc, PageviewDoc } from "@/lib/analytics/report";

/** A /start-project lead (collection "leads"). */
export type LeadDoc = WithMeta<LeadRecord>;

const HOUR = 3_600_000;

export const RANGES = [
  { key: "24h", label: "24 hours", short: "24h", ms: 24 * HOUR },
  { key: "7d", label: "7 days", short: "7d", ms: 7 * 24 * HOUR },
  { key: "30d", label: "30 days", short: "30d", ms: 30 * 24 * HOUR },
  { key: "90d", label: "90 days", short: "90d", ms: 90 * 24 * HOUR },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

export function rangeOf(key: RangeKey) {
  return RANGES.find((range) => range.key === key) ?? RANGES[1];
}

export type EnquiryKind = "contact" | "landing";

/** One row of the merged inbox (Overview feed, bell menu, global search). */
export type InboxItem = {
  source: EnquiryKind;
  id: string;
  createdAt: Date | null;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** One line: service / plan + price / project types / first words of the message. */
  summary: string;
  status: ContactStatus | LeadStatus;
  /** Arrived after the previous visit (lastSeen). */
  fresh: boolean;
  /** Hash link to the detail view. */
  href: string;
};

/** settings/dashboard as the app uses it. */
export type SettingsState = { excludedVisitors: string[]; updatedAt: Date | null };

/** Raw analytics documents of the loaded window (the selected range, its previous period and a margin). */
export type AnalyticsDocs = {
  pageviews: PageviewDoc[];
  events: EventDoc[];
  /** Start of the selected range. */
  since: Date;
  /** End of the selected range (load time). */
  until: Date;
  /** Start of the comparison period (since - range length). */
  prevSince: Date;
  /** Oldest time covered by the loaded documents (prevSince or earlier, minus a context margin). */
  loadedFrom: Date;
  loadedAt: Date;
};

/** What a data source returns for one load of the inbox collections. */
export type InboxLoad = { contacts: ContactDoc[]; leads: LeadDoc[] };

/** What a data source returns for one analytics window. */
export type AnalyticsLoad = { pageviews: PageviewDoc[]; events: EventDoc[]; pageviewsTruncated: boolean; eventsTruncated: boolean };

/**
 * Backend behind the provider. The live source talks to Firestore with the admin's ID token
 * (data/liveSource.ts); the dev-only demo source keeps generated data in memory (data/demo.ts).
 * Methods throw on failure (FirestoreError or SessionExpiredError); the provider handles them.
 */
export interface AdminSource {
  mode: "live" | "demo";
  /** Poll interval for new contacts and leads, ms. */
  pollMs: number;
  /** Newest contacts and leads, regardless of range (max `limit` each). */
  loadInbox(limit: number): Promise<InboxLoad>;
  /** Page views and events with createdAt in [since, until), newest first (max `max` each). */
  loadAnalytics(since: Date, until: Date, max: number): Promise<AnalyticsLoad>;
  loadSettings(): Promise<SettingsState | null>;
  /** Documents created at or after the given times (null = latest 100). */
  pollNew(contactsSince: Date | null, leadsSince: Date | null): Promise<InboxLoad>;
  updateContact(id: string, fields: { status: ContactStatus; note?: string }): Promise<void>;
  updateLead(id: string, fields: { status: LeadStatus; note?: string }): Promise<void>;
  saveSettings(excludedVisitors: string[]): Promise<void>;
  /** Retention clean-up; returns how many documents were deleted. */
  purge(): Promise<number>;
  /** Every document of one visitor, for visitorJourney(). */
  journeyDocs(visitorId: string): Promise<{ pageviews: PageviewDoc[]; events: EventDoc[]; contacts: ContactDoc[] }>;
}

/** Thrown by a source when there is no valid ID token any more; the provider signs out. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}
