"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getValidIdToken } from "@/lib/firebase/auth";
import { ADMIN_ORIGIN } from "@/lib/site";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  PUSH_SERVER_STALE_MS,
  canInstall,
  disablePush,
  enablePush,
  promptInstall,
  pushServerStatus,
  pushState,
  sendTestPush,
  subscribeInstall,
  type PushServerStatus,
  type PushState,
} from "../../data/push";
import { timeAgo } from "../../data/records";
import { Button, LinkButton, Notice, StatusPill, TONE_DOT, useToast, type Tone } from "../../kit";
import { StepList } from "./parts";

/**
 * Settings > Enquiry alerts > Background push on this device: turn push on or off, send a test
 * through the push server, install the app (Chrome's prompt, or the iPhone Home Screen steps), and
 * whether the push server on the VPS is running (its report at pushServer/status, refreshed every
 * minute here). Push itself is described in data/push.ts.
 */

/** undefined while loading; "error" when the report could not be read. */
type ServerReport = PushServerStatus | null | "error" | undefined;

function serverLine(report: ServerReport, now: number): { tone: Tone; text: string } | null {
  if (report === undefined) return null;
  if (report === "error") return { tone: "muted", text: "Push server status could not be loaded." };
  if (!report || !report.lastSeen) return { tone: "yellow", text: "Push server not connected yet. Alerts start as soon as it runs." };
  const where = report.label ? ` (${report.label})` : "";
  if (now - report.lastSeen.getTime() <= PUSH_SERVER_STALE_MS) {
    return { tone: "green", text: `Push server online${where}, last report ${timeAgo(report.lastSeen, now)}.` };
  }
  return { tone: "red", text: `Push server offline${where} since ${timeAgo(report.lastSeen, now)}. Alerts resume when it runs again.` };
}

const STATE: Record<PushState, { label: string; tone: Tone; text: string }> = {
  on: { label: "Push on", tone: "green", text: "This device gets an alert for every new contact and landing lead, even when the app is closed." },
  off: { label: "Push off", tone: "yellow", text: "Turn push on to get every new enquiry instantly on this device, even when the app is closed." },
  denied: { label: "Blocked", tone: "red", text: "Notifications are blocked for the admin in this browser's site settings." },
  "needs-install": { label: "Install first", tone: "accent", text: "On iPhone and iPad, push works only from the app on the Home Screen." },
  "other-host": { label: "Admin app only", tone: "muted", text: "Background push runs in the admin app on its own address, not on this one." },
  unsupported: { label: "Not supported", tone: "muted", text: "This browser cannot receive push alerts. Use Chrome on Android, Safari on iPhone (Home Screen app) or a desktop browser." },
};

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Please try again.";
}

export default function PushControls() {
  const { mode } = useAdminData();
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<"on" | "off" | "test" | "install" | null>(null);
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  const [server, setServer] = useState<ServerReport>(undefined);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void pushState().then((value) => {
      if (!cancelled) setState(mode === "demo" && value !== "other-host" ? "unsupported" : value);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "live") return;
    let cancelled = false;
    const load = async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return;
        const report = await pushServerStatus(token);
        if (!cancelled) setServer(report);
      } catch {
        if (!cancelled) setServer("error");
      } finally {
        if (!cancelled) setNow(Date.now());
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode]);

  const withToken = useCallback(
    async (run: (token: string) => Promise<void>) => {
      const token = await getValidIdToken();
      if (!token) {
        toast({ tone: "error", title: "Session expired", description: "Sign in again, then retry." });
        return;
      }
      await run(token);
    },
    [toast],
  );

  async function turnOn() {
    setBusy("on");
    try {
      await withToken(async (token) => {
        const next = await enablePush(token);
        setState(next);
        if (next === "on") toast({ tone: "success", title: "Push is on", description: "Every new enquiry now arrives on this device instantly." });
        else if (next === "denied") toast({ tone: "error", title: "Notifications were blocked", description: "Allow them in the site settings, then try again." });
      });
    } catch (error) {
      toast({ tone: "error", title: "Could not turn push on", description: errorText(error) });
    } finally {
      setBusy(null);
    }
  }

  async function turnOff() {
    setBusy("off");
    try {
      await withToken(async (token) => {
        setState(await disablePush(token));
        toast({ tone: "info", title: "Push is off on this device" });
      });
    } catch (error) {
      toast({ tone: "error", title: "Could not turn push off", description: errorText(error) });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    try {
      await withToken(async (token) => {
        await sendTestPush(token);
        toast({ tone: "success", title: "Test push requested", description: "It reaches every device with push on within a few seconds." });
      });
    } catch (error) {
      toast({ tone: "error", title: "Could not send the test", description: errorText(error) });
    } finally {
      setBusy(null);
    }
  }

  async function install() {
    setBusy("install");
    try {
      const installed = await promptInstall();
      if (installed) toast({ tone: "success", title: "App installed", description: "Open it from your home screen and turn push on there." });
    } finally {
      setBusy(null);
    }
  }

  const info = state ? STATE[state] : null;
  const serverInfo = mode === "live" ? serverLine(server, now) : null;

  return (
    <div className="min-w-0 rounded-sharp border border-line bg-canvas/60 p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-[0.875rem] font-medium text-fg">Background push on this device</p>
        {info ? (
          <StatusPill tone={info.tone} size="sm">
            {info.label}
          </StatusPill>
        ) : null}
      </div>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted text-pretty">{info ? info.text : "Checking…"}</p>
      {serverInfo ? (
        <p className="mt-2 flex min-w-0 items-start gap-2 text-[0.8125rem] leading-relaxed text-fg text-pretty" role="status">
          <span aria-hidden="true" className="mt-[0.4rem] size-2 shrink-0 rounded-full" style={{ backgroundColor: TONE_DOT[serverInfo.tone] }} />
          <span className="min-w-0">{serverInfo.text}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {state === "off" ? (
          <Button variant="primary" icon="bell" loading={busy === "on"} onClick={() => void turnOn()}>
            Turn on push
          </Button>
        ) : null}
        {state === "on" ? (
          <>
            <Button icon="send" loading={busy === "test"} onClick={() => void test()}>
              Send test push
            </Button>
            <Button variant="ghost" loading={busy === "off"} onClick={() => void turnOff()}>
              Turn off
            </Button>
          </>
        ) : null}
        {installable ? (
          <Button icon="smartphone" loading={busy === "install"} onClick={() => void install()}>
            Install app
          </Button>
        ) : null}
        {state === "other-host" && mode === "live" ? (
          <LinkButton href={ADMIN_ORIGIN} icon="arrowUpRight">
            Open admin app
          </LinkButton>
        ) : null}
      </div>

      {state === "needs-install" ? (
        <div className="mt-3">
          <StepList
            steps={[
              <>Open this admin in Safari (same address as now).</>,
              <>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</>,
              <>Open the app from the Home Screen, sign in and tap <strong>Turn on push</strong>.</>,
            ]}
          />
        </div>
      ) : null}
      {state === "denied" ? (
        <Notice tone="warning" title="How to unblock" className="mt-3">
          Open the browser&apos;s <strong>Site settings</strong> for the admin, set <strong>Notifications</strong> to{" "}
          <strong>Allow</strong>, then reload.
        </Notice>
      ) : null}
    </div>
  );
}
