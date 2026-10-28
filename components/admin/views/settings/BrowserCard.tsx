"use client";

import { useEffect, useState } from "react";
import { INTERNAL_PARAM, isAdminHost, isInternalBrowser, setInternalBrowser } from "@/lib/analytics/env";
import { site } from "@/lib/site";
import { peekVisitorId } from "@/lib/analytics/identity";
import { Card, CardHeader, CopyButton, LinkButton, StatusPill, eyebrow, useToast } from "../../kit";
import { SettingRow, Switch } from "./parts";

/**
 * Settings > This browser. The "don't track this browser" switch (localStorage bs_internal via
 * lib/analytics/env) and this browser's anonymous visitor id (bs_vid), which can be copied or added to
 * the excluded list. Both are per browser and per site address, so they are read after mount.
 * On the admin's own site the website's storage is out of reach: the card links to the website with
 * ?bs_internal=on|off instead (lib/analytics/env.ts applyInternalParam).
 */

export type BrowserIdentity = {
  /** False until read on the client (avoids a hydration mismatch). */
  ready: boolean;
  /** Visitor id stored in this browser for this site address ("" when there is none). */
  visitorId: string;
  host: string;
  /** Running on the admin site, not the website. */
  adminHost: boolean;
};

/** This browser's visitor id and site address, read once after mount. */
export function useBrowserIdentity(): BrowserIdentity {
  const [identity, setIdentity] = useState<BrowserIdentity>({ ready: false, visitorId: "", host: "", adminHost: false });
  useEffect(() => {
    let host = "";
    try {
      host = window.location.host;
    } catch {
      /* no location */
    }
    setIdentity({ ready: true, visitorId: peekVisitorId(), host, adminHost: isAdminHost() });
  }, []);
  return identity;
}

export default function BrowserCard({ identity }: { identity: BrowserIdentity }) {
  const { toast } = useToast();
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    setInternal(isInternalBrowser());
  }, []);

  function toggle(next: boolean) {
    setInternalBrowser(next);
    setInternal(isInternalBrowser());
    toast(
      next
        ? { tone: "success", title: "This browser is not tracked", description: "Its visits stay out of analytics from now on, in every open tab." }
        : { tone: "info", title: "This browser is tracked again", description: "Applies from the next page load of the website." },
    );
  }

  if (identity.adminHost) return <WebsiteBrowserCard />;

  return (
    <Card aria-labelledby="settings-browser">
      <CardHeader
        id="settings-browser"
        icon="monitor"
        title="This browser"
        description={identity.host ? `Applies to ${identity.host} on this device only.` : "Applies to this device only."}
      />

      <SettingRow
        titleId="settings-internal-title"
        descriptionId="settings-internal-desc"
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Don&apos;t track this browser
            {identity.ready ? (
              <StatusPill tone={internal ? "green" : "muted"} size="sm">
                {internal ? "Internal" : "Tracked"}
              </StatusPill>
            ) : null}
          </span>
        }
        description={
          <>
            Mark it as one of the team&apos;s own: <strong>no page views, clicks or Google Analytics</strong>, and its contact enquiries
            carry no visitor id. Use it on every phone and laptop you open the website with.
          </>
        }
        control={
          <Switch
            checked={internal}
            onChange={toggle}
            label="Don't track this browser"
            describedBy="settings-internal-desc"
            disabled={!identity.ready}
          />
        }
      />

      <div className="mt-4 rounded-sharp border border-line bg-canvas/60 px-3 py-2.5">
        <p className={eyebrow}>Visitor id of this browser</p>
        {identity.ready && identity.visitorId ? (
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <code className="min-w-0 font-mono text-[0.8125rem] text-fg [overflow-wrap:anywhere]">{identity.visitorId}</code>
            <CopyButton value={identity.visitorId} label="Copy visitor id" />
          </div>
        ) : (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            {identity.ready ? "None yet: this browser has not been counted as a visitor on this address." : "Reading…"}
          </p>
        )}
      </div>
    </Card>
  );
}

/** Admin-site version: marking happens on the website itself, which owns the setting. */
function WebsiteBrowserCard() {
  const base = site.url.replace(/\/$/, "");
  return (
    <Card aria-labelledby="settings-browser">
      <CardHeader
        id="settings-browser"
        icon="monitor"
        title="This browser"
        description={`Applies to ${base.replace(/^https?:\/\//, "")} on this device only.`}
      />
      <p className="text-[0.8125rem] leading-relaxed text-muted text-pretty">
        Keep your own visits out of analytics: open the website once with the link below on every phone and laptop you use.
        It marks that browser as the team&apos;s own (<strong>no page views, clicks or Google Analytics</strong>). Visits it
        already made can be left out with the excluded visitors list below (visitor ids are in Analytics &rsaquo; Sessions).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <LinkButton href={`${base}/?${INTERNAL_PARAM}=on`} target="_blank" rel="noopener" icon="shield">
          Don&apos;t track this browser
        </LinkButton>
        <LinkButton href={`${base}/?${INTERNAL_PARAM}=off`} target="_blank" rel="noopener" variant="ghost">
          Track it again
        </LinkButton>
      </div>
    </Card>
  );
}
