"use client";

import type { ReactNode } from "react";
import type { Channel } from "@/lib/analytics/channels";
import { CHANNEL_ICON, CHANNEL_TONE, channelColor, eventMeta } from "../data/analytics";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { Card, CardHeader } from "./Card";
import { StatusPill } from "./Pills";
import { cx, eyebrow } from "./cx";

/**
 * Analytics building blocks: ChannelDot / ChannelPill (channel identity), EventPill (tracked event
 * type), CountryCode (two-letter chip), MiniStat (compact figure), DrawerHeading (section heading in
 * a drawer) and TableCard (a card that frames a bare DataTable).
 */

/**
 * Channel identity mark for lists and tables: the channel's fixed chart colour as a dot plus its
 * icon. Always shown beside the channel's text label, so colour is never the only cue.
 */
export function ChannelDot({ channel }: { channel: Channel }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-muted">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: channelColor(channel) }} />
      <AdminIcon name={CHANNEL_ICON[channel]} size={14} />
    </span>
  );
}

export function ChannelPill({ channel, size = "sm" }: { channel: Channel; size?: "sm" | "md" }) {
  return (
    <StatusPill tone={CHANNEL_TONE[channel] ?? "muted"} size={size}>
      {channel}
    </StatusPill>
  );
}

/** Event pill: tone + icon-free text, always labelled. */
export function EventPill({ type, label, size = "sm" }: { type: string; label?: string; size?: "sm" | "md" }) {
  const meta = eventMeta(type, label);
  return (
    <StatusPill tone={meta.tone} size={size}>
      {meta.label}
    </StatusPill>
  );
}

/** Two-letter country code chip (flag emoji do not render on Windows, so codes are used instead). */
export function CountryCode({ code }: { code: string | null | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-[0.3rem] border border-line bg-fg/[0.04] font-mono text-[0.625rem] font-medium uppercase text-muted"
    >
      {code && code !== "unknown" ? code.slice(0, 2) : "--"}
    </span>
  );
}

/** Compact figure for drawers and summary strips: label above a mono value. */
export function MiniStat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0 rounded-sharp border border-line bg-canvas/50 px-3 py-2.5", className)}>
      <p className={cx(eyebrow, "leading-tight [overflow-wrap:anywhere]")}>{label}</p>
      <p className="mt-1 truncate font-mono text-[1.0625rem] font-medium tabular-nums text-fg">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-[0.6875rem] text-muted">{sub}</p> : null}
    </div>
  );
}

/** Heading inside a drawer section. */
export function DrawerHeading({ icon, children, aside }: { icon?: AdminIconName; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <h3 className="flex min-w-0 items-center gap-2 text-[0.875rem] font-semibold text-fg">
        {icon ? <AdminIcon name={icon} size={16} className="shrink-0 text-muted" /> : null}
        <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
      </h3>
      {aside ? <div className="min-w-0 text-[0.75rem] text-muted">{aside}</div> : null}
    </div>
  );
}

/**
 * A card that holds a `bare` DataTable: padded header (title, definition tip, actions) and an
 * optional toolbar row (search, filter chips), then the table edge to edge under a hairline.
 */
export function TableCard({
  title,
  icon,
  hint,
  description,
  toolbar,
  actions,
  children,
  id,
}: {
  title: ReactNode;
  icon?: AdminIconName;
  hint?: string;
  description?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Card padding="none" id={id}>
      <div className="p-4 pb-3 sm:p-5 sm:pb-4">
        <CardHeader title={title} icon={icon} hint={hint} description={description} actions={actions} className={toolbar ? undefined : "mb-0"} />
        {toolbar}
      </div>
      <div className="border-t border-line">{children}</div>
    </Card>
  );
}
