import { CHANNELS, OWN_HOSTS, hostOf, type Channel } from "@/lib/analytics/channels";
import type { EventDoc, Kpi, PageStatsRow, SessionDetail } from "@/lib/analytics/report";
import { formatDuration, formatNumber, formatPercent } from "@/lib/analytics/report";
import type { DeviceType } from "@/lib/firebase/schema";
import type { AdminIconName } from "../kit/AdminIcon";
import type { Tone } from "../kit/Pills";
import { seriesColor } from "../charts/palette";

/**
 * Pure analytics helpers shared by the Analytics tabs: channel colours, icons and tones that follow
 * the channel (never its rank), the referrer breakdown of the old dashboard (report.sources mixes UTM
 * sources in), KPI value formatting, page aggregates, event labels, device labels, load-time
 * formatting and the in-range event filter.
 */

/** Fixed colour per channel, in CHANNELS order, so a channel keeps its colour in every chart. */
export function channelColor(channel: Channel): string {
  return seriesColor(CHANNELS.indexOf(channel));
}

export const CHANNEL_ICON: Record<Channel, AdminIconName> = {
  Direct: "pointer",
  "Organic search": "search",
  "AI assistants": "sparkles",
  Social: "users",
  Email: "mail",
  Paid: "wallet",
  Campaign: "target",
  Referral: "external",
};

/** A Kpi as display text; a dash when nothing was measured. */
export function kpiText(kpi: Kpi): string {
  if (!kpi.measured) return "-";
  switch (kpi.kind) {
    case "duration":
      return formatDuration(kpi.value);
    case "rate":
      return formatPercent(kpi.value, 1);
    case "average":
      return formatNumber(kpi.value, 1);
    default:
      return formatNumber(kpi.value);
  }
}

export type ReferrerRow = {
  host: string;
  sessions: number;
  visitors: number;
  engaged: number;
  submitted: number;
  share: number;
  channel: Channel;
};

const OWN = new Set(OWN_HOSTS.map((h) => h.replace(/^www\./, "")));

/**
 * Sessions in range by the referring site of their landing page (the old "Referrers" table):
 * "(direct)" without a referrer (or from this site), "(not set)" when the landing page view began
 * before the loaded data.
 */
export function referrerRows(sessions: readonly SessionDetail[]): ReferrerRow[] {
  const map = new Map<string, { sessions: number; visitors: Set<string>; engaged: number; submitted: number; channels: Map<Channel, number> }>();
  let total = 0;
  for (const s of sessions) {
    if (!s.inRange) continue;
    total += 1;
    const host = !s.landingInData ? "(not set)" : hostOf(s.referrer);
    const key = s.landingInData && (!host || OWN.has(host)) ? "(direct)" : host || "(not set)";
    let row = map.get(key);
    if (!row) {
      row = { sessions: 0, visitors: new Set(), engaged: 0, submitted: 0, channels: new Map() };
      map.set(key, row);
    }
    row.sessions += 1;
    if (s.visitorId) row.visitors.add(s.visitorId);
    if (s.engaged) row.engaged += 1;
    if (s.submitted || s.enquiryIds.length) row.submitted += 1;
    row.channels.set(s.channel, (row.channels.get(s.channel) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([host, r]) => {
      let channel: Channel = "Direct";
      let best = -1;
      for (const [c, n] of r.channels) if (n > best) [channel, best] = [c, n];
      return { host, sessions: r.sessions, visitors: r.visitors.size, engaged: r.engaged, submitted: r.submitted, share: total ? r.sessions / total : 0, channel };
    })
    .sort((a, b) => b.sessions - a.sessions || a.host.localeCompare(b.host));
}

export type PageTotals = {
  paths: number;
  views: number;
  /** Visible time per page view (ms); the old "Avg. time on page". */
  avgMsPerView: number;
  /** View-weighted mean scroll %, null when no page measured it. */
  avgScroll: number | null;
};

export function pageTotals(pages: readonly PageStatsRow[]): PageTotals {
  let views = 0;
  let ms = 0;
  let scrollSum = 0;
  let scrollViews = 0;
  for (const p of pages) {
    views += p.views;
    ms += p.totalEngagedMs;
    if (p.avgScroll !== null) {
      scrollSum += p.avgScroll * p.views;
      scrollViews += p.views;
    }
  }
  return { paths: pages.length, views, avgMsPerView: views ? ms / views : 0, avgScroll: scrollViews ? scrollSum / scrollViews : null };
}

/* ------------------------------------------------------------------ events, channels, devices */

export type EventMeta = { label: string; plural: string; icon: AdminIconName; tone: Tone };

const EVENT_META: Record<string, EventMeta> = {
  cta_click: { label: "CTA click", plural: "CTA clicks", icon: "pointer", tone: "accent" },
  outbound: { label: "Outbound link", plural: "Outbound links", icon: "external", tone: "blue" },
  play: { label: "Video play", plural: "Video plays", icon: "play", tone: "violet" },
  mailto: { label: "Email click", plural: "Email clicks", icon: "mail", tone: "green" },
  tel: { label: "Phone click", plural: "Phone clicks", icon: "phone", tone: "green" },
  nav: { label: "Navigation", plural: "Navigation clicks", icon: "list", tone: "muted" },
  form_start: { label: "Form started", plural: "Forms started", icon: "note", tone: "yellow" },
  form_error: { label: "Form error", plural: "Form errors", icon: "alert", tone: "red" },
  form_submit: { label: "Form sent", plural: "Forms sent", icon: "send", tone: "green" },
};

/** Human label, icon and pill tone for a tracked event type (unknown types keep their raw name). */
export function eventMeta(type: string, label?: string): EventMeta {
  const meta = EVENT_META[type];
  if (!meta) return { label: type || "unknown", plural: type || "unknown", icon: "activity", tone: "muted" };
  if (type === "form_submit" && label === "contact:failed") return { ...meta, label: "Form failed", tone: "red" };
  return meta;
}

/** Readable event label: form events lose their "contact:" prefix, empty labels fall back to the link. */
export function eventText(event: { type: string; label?: string; href?: string }): string {
  const label = event.label ?? "";
  if (event.type === "form_error") return label.replace(/^contact:?/, "").split(",").filter(Boolean).join(", ") || "Contact form";
  if (event.type === "form_start") return "Contact form";
  if (event.type === "form_submit") return label === "contact:failed" ? "Contact form (not saved)" : "Contact form";
  return label || event.href || "-";
}

/** Pill tone per channel (always paired with the text label). */
export const CHANNEL_TONE: Record<Channel, Tone> = {
  Direct: "muted",
  "Organic search": "green",
  "AI assistants": "violet",
  Social: "blue",
  Email: "yellow",
  Paid: "accent",
  Campaign: "accent",
  Referral: "blue",
};

export function deviceIcon(device: DeviceType | string | null | undefined): AdminIconName {
  if (device === "mobile") return "smartphone";
  if (device === "tablet") return "tablet";
  if (device === "desktop") return "monitor";
  return "device";
}

export function deviceLabel(device: DeviceType | string | null | undefined): string {
  return device ? device[0].toUpperCase() + device.slice(1) : "Unknown device";
}

/** "a1b2c3d4…" short form of an anonymous id. */
export function shortId(id: string, length = 8): string {
  return id.length > length + 1 ? `${id.slice(0, length)}…` : id;
}

/* ------------------------------------------------------------------ numbers */

/** Load time: "840 ms", "1.24 s", "12.5 s"; "-" when unmeasured. */
export function formatLoad(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  return `${s.toFixed(s < 10 ? 2 : 1)} s`;
}

export type SpeedRating = { label: string; tone: Tone };

/** Rating of a full page load (load event): under 2.5 s fast, under 4 s fair, else slow. */
export function speedRating(ms: number | null | undefined): SpeedRating | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null;
  if (ms < 2500) return { label: "Fast", tone: "green" };
  if (ms < 4000) return { label: "Fair", tone: "yellow" };
  return { label: "Slow", tone: "red" };
}

/* ------------------------------------------------------------------ events */

/** In-range events of the report, minus excluded visitors, newest first (what the report itself counts). */
export function eventsInRange(events: readonly EventDoc[], since: Date, until: Date, excluded: readonly string[]): EventDoc[] {
  const skip = new Set(excluded);
  const from = since.getTime();
  const to = until.getTime();
  return events
    .filter((event) => {
      const t = event.createdAt instanceof Date ? event.createdAt.getTime() : NaN;
      return t >= from && t < to && !(event.visitorId && skip.has(event.visitorId));
    })
    .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
}
