"use client";

import { useMemo, useState } from "react";
import { useAdminData } from "../../data/AdminDataProvider";
import { contactNotification, leadNotification, type NotificationPayload } from "../../data/notify";
import { showSystemNotification, type NotifyPermission } from "../../data/systemNotify";
import { AdminIcon, Button, Card, CardHeader, Notice, Segmented, StatusPill, eyebrow, useToast, type Tone } from "../../kit";
import { IconList, RowDivider } from "./parts";
import PushControls from "./PushControls";

/**
 * Settings > Enquiry alerts. Shows the browser's notification permission, lets the owner turn alerts
 * on and send a test, previews the exact wording a new lead / contact alert uses (data/notify.ts, the
 * same text the later push Cloud Function will send) and explains what arrives instantly today versus
 * after the installable admin app with background push.
 */

const PERMISSION: Record<NotifyPermission, { label: string; tone: Tone; text: string }> = {
  granted: { label: "On", tone: "green", text: "This browser shows a system notification for every new enquiry." },
  default: { label: "Not enabled", tone: "yellow", text: "Turn alerts on to get a system notification for every new enquiry." },
  denied: { label: "Blocked", tone: "red", text: "Notifications are blocked for this site in the browser settings." },
  unsupported: { label: "Not supported", tone: "muted", text: "This browser cannot show system notifications." },
};

type PreviewKind = "lead" | "contact";

const SAMPLE_LEAD = {
  id: "sample",
  kind: "plan" as const,
  name: "Aarav Mehta",
  company: "Mehta Interiors",
  plan: "Growth",
  price: 79_999,
  currency: "INR",
  phone: "+91 98765 43210",
  email: "aarav@example.com",
  contactPref: "WhatsApp",
};

const SAMPLE_CONTACT = {
  id: "sample",
  name: "Priya Shah",
  company: "Shah & Co.",
  service: "Website design",
  phone: "+91 91234 56789",
  email: "priya@example.com",
  budget: "₹50k–1L",
  message: "We need a new website for our clinic before Diwali.",
};

export default function NotificationsCard() {
  const { notifications, leads, contacts, mode } = useAdminData();
  const { toast } = useToast();
  const [kind, setKind] = useState<PreviewKind>("lead");
  const [busy, setBusy] = useState<"enable" | "test" | null>(null);
  const state = PERMISSION[notifications.permission];
  const pollSeconds = mode === "demo" ? 45 : 60;

  // Preview the newest real enquiry of the chosen kind (falls back to a sample).
  const preview = useMemo<NotificationPayload>(() => {
    if (kind === "lead") return leadNotification(leads[0] ?? SAMPLE_LEAD);
    return contactNotification(contacts[0] ?? SAMPLE_CONTACT);
  }, [kind, leads, contacts]);

  async function enable() {
    setBusy("enable");
    try {
      const result = await notifications.request();
      if (result === "granted") toast({ tone: "success", title: "Alerts are on", description: "New enquiries now show a system notification." });
      else if (result === "denied") toast({ tone: "error", title: "Notifications were blocked", description: "Allow them in the browser's site settings to get alerts." });
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy("test");
    try {
      const shown = await showSystemNotification({ ...preview, tag: `test-${Date.now()}` });
      if (shown) toast({ tone: "success", title: "Test notification sent", description: "Check your notification tray if it did not pop up." });
      else toast({ tone: "error", title: "Could not show the notification", description: "Allow notifications for this site in the browser settings, then try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card aria-labelledby="settings-alerts">
      <CardHeader
        id="settings-alerts"
        icon="bell"
        title="Enquiry alerts"
        description="Contact form and landing-page leads, the moment they arrive."
        actions={<StatusPill tone={state.tone}>{state.label}</StatusPill>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-[0.875rem] leading-relaxed text-muted text-pretty">{state.text}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {notifications.permission === "default" ? (
            <Button variant="primary" icon="bell" loading={busy === "enable"} onClick={() => void enable()}>
              Enable alerts
            </Button>
          ) : null}
          {notifications.permission === "granted" ? (
            <Button icon="send" loading={busy === "test"} onClick={() => void sendTest()}>
              Send test
            </Button>
          ) : null}
        </div>
      </div>

      {notifications.permission === "denied" ? (
        <Notice tone="warning" title="How to unblock" className="mt-4">
          Tap the icon to the left of the address bar (or the browser menu &rsaquo; <strong>Site settings</strong>), set{" "}
          <strong>Notifications</strong> to <strong>Allow</strong>, then reload this page.
        </Notice>
      ) : null}
      {notifications.permission === "unsupported" ? (
        <Notice tone="neutral" title="On iPhone or iPad?" className="mt-4">
          Safari shows notifications only for web apps added to the Home Screen (iOS 16.4 or later): open{" "}
          <strong>admin.brightonsolution.com</strong> in Safari, tap Share, then Add to Home Screen.
        </Notice>
      ) : null}

      <div className="mt-4">
        <PushControls />
      </div>

      <RowDivider />

      {/* Preview of the real wording */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={eyebrow}>Preview</p>
        <Segmented
          size="sm"
          ariaLabel="Preview alert for"
          value={kind}
          onChange={setKind}
          options={[
            { value: "lead", label: "Landing lead" },
            { value: "contact", label: "Contact" },
          ]}
        />
      </div>
      <NotificationPreview payload={preview} sample={kind === "lead" ? !leads[0] : !contacts[0]} />

      <RowDivider />

      {/* What arrives when */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="min-w-0">
          <p className="mb-2.5 flex items-center gap-2 text-[0.8125rem] font-medium text-fg">
            <StatusPill tone="green" size="sm">
              Now
            </StatusPill>
            While the admin is open
          </p>
          <IconList
            items={[
              { icon: "refresh", tone: "green", text: <>Checks for new enquiries every <strong>{pollSeconds} s</strong> and the moment you return to the tab.</> },
              { icon: "bell", tone: "green", text: <>In-app toast, a <strong>system notification</strong> (when on), the count in the tab title and on the app icon.</> },
              { icon: "layers", tone: "green", text: <>More than three at once arrive as one summary alert.</> },
              { icon: "info", text: <>Only while a tab with the admin is open (it can be in the background).</> },
            ]}
          />
        </div>
        <div className="min-w-0">
          <p className="mb-2.5 flex items-center gap-2 text-[0.8125rem] font-medium text-fg">
            <StatusPill tone="accent" size="sm">
              Push
            </StatusPill>
            Even when the admin is closed
          </p>
          <IconList
            items={[
              { icon: "smartphone", tone: "accent", text: <>Install <strong>admin.brightonsolution.com</strong> on your phone like an app, then turn push on above.</> },
              { icon: "zap", tone: "accent", text: <><strong>Instant push</strong> the second a form is submitted, even when the app is closed or the phone is locked.</> },
              { icon: "pointer", tone: "accent", text: <>Tapping an alert opens that exact lead or contact; on Android, WhatsApp is one tap away.</> },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

/** A look-alike of a phone notification, using the real title and body lines. */
function NotificationPreview({ payload, sample }: { payload: NotificationPayload; sample: boolean }) {
  const lines = payload.body.split("\n").filter(Boolean);
  return (
    <div className="mt-3">
      <div
        className="flex min-w-0 gap-3 rounded-[1rem] border border-line-strong bg-surface-2 p-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
        role="group"
        aria-label="Notification preview"
      >
        <img src={payload.icon} alt="" width={36} height={36} className="size-9 shrink-0 rounded-[0.6rem] bg-canvas" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2 text-[0.6875rem] text-muted">
            <span className="truncate">BrightonSolution Admin</span>
            <span className="shrink-0">now</span>
          </div>
          <p className="mt-0.5 text-[0.875rem] font-semibold leading-snug text-fg [overflow-wrap:anywhere]">{payload.title}</p>
          <div className="mt-0.5 space-y-px text-[0.8125rem] leading-snug text-muted">
            {lines.map((line, i) => (
              <p key={i} className="[overflow-wrap:anywhere]">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[0.75rem] leading-relaxed text-muted">
        <AdminIcon name="info" size={14} className="mt-[2px] shrink-0" />
        <span>
          {sample ? "Sample enquiry. " : "Built from your newest enquiry. "}
          Phones may shorten long lines.
        </span>
      </p>
    </div>
  );
}
