"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getValidIdToken } from "@/lib/firebase/auth";
import { ADMIN_ORIGIN } from "@/lib/site";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  canInstall,
  disablePush,
  enablePush,
  promptInstall,
  pushState,
  sendTestPush,
  subscribeInstall,
  type PushState,
} from "../../data/push";
import { Button, LinkButton, Notice, StatusPill, useToast, type Tone } from "../../kit";
import { StepList } from "./parts";

/**
 * Settings > Enquiry alerts > Background push on this device: turn push on or off, send a test
 * through the Cloud Function, and install the app (Chrome's prompt, or the iPhone Home Screen steps).
 * Push itself is described in data/push.ts.
 */

const STATE: Record<PushState, { label: string; tone: Tone; text: string }> = {
  on: { label: "Push on", tone: "green", text: "This device gets an alert for every new contact and landing lead, even when the app is closed." },
  off: { label: "Push off", tone: "yellow", text: "Turn push on to get every new enquiry instantly on this device, even when the app is closed." },
  denied: { label: "Blocked", tone: "red", text: "Notifications are blocked for the admin in this browser's site settings." },
  "needs-install": { label: "Install first", tone: "accent", text: "On iPhone and iPad, push works only from the app on the Home Screen." },
  "other-host": { label: "Admin app only", tone: "muted", text: "Background push runs in the admin app at admin.brightonsolution.com." },
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

  useEffect(() => {
    let cancelled = false;
    void pushState().then((value) => {
      if (!cancelled) setState(mode === "demo" && value !== "other-host" ? "unsupported" : value);
    });
    return () => {
      cancelled = true;
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
              <>Open <strong>admin.brightonsolution.com</strong> in Safari.</>,
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
