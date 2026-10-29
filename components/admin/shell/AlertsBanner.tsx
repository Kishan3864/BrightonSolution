"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getValidIdToken } from "@/lib/firebase/auth";
import { useAdminData } from "../data/AdminDataProvider";
import { canInstall, enablePush, promptInstall, pushState, subscribeInstall, type PushState } from "../data/push";
import { Button, Notice, useToast } from "../kit";
import { StepList } from "../views/settings/parts";

/**
 * Top-of-app nudge until this device gets enquiry alerts: "Turn on alerts" (one tap; the browser asks
 * for permission), the Add to Home Screen steps on iPhone/iPad (Safari and Chrome there have no
 * install prompt, and iOS delivers push only to Home Screen apps), or how to unblock notifications.
 * "Later" hides it on this device for 3 days. Settings > Enquiry alerts has the same controls.
 */

const DISMISS_KEY = "bs_alerts_banner_later";
const DISMISS_MS = 3 * 24 * 3600 * 1000;

/** Which browser on iPhone/iPad: the Share button sits in a different place. */
function iosBrowser(): "safari" | "chrome" | "other" {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/CriOS\//.test(ua)) return "chrome";
  if (/FxiOS\/|EdgiOS\//.test(ua)) return "other";
  return "safari";
}

/** Add to Home Screen steps for iPhone/iPad, worded for the browser in use. */
export function IosInstallSteps() {
  const browser = iosBrowser();
  const share =
    browser === "chrome" ? (
      <>Tap the <strong>Share</strong> icon in the address bar (top right).</>
    ) : browser === "safari" ? (
      <>Tap <strong>Share</strong> (the square with an arrow, at the bottom of the screen; top right on iPad).</>
    ) : (
      <>Open the browser menu and tap <strong>Share</strong>.</>
    );
  return (
    <StepList
      steps={[
        share,
        <>Tap <strong>Add to Home Screen</strong> (scroll down, or under <strong>More</strong>), keep <strong>Open as Web App</strong> on, then <strong>Add</strong>.</>,
        <>Open <strong>Brighton Admin</strong> from the Home Screen, sign in once and tap <strong>Turn on alerts</strong>. It stays signed in after that.</>,
      ]}
    />
  );
}

function dismissedRecently(): boolean {
  try {
    return Date.now() - Number(window.localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_MS;
  } catch {
    return false;
  }
}

export default function AlertsBanner() {
  const { mode } = useAdminData();
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);

  const check = useCallback(() => {
    void pushState().then(setState);
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    setHidden(dismissedRecently());
    check();
    // Coming back from the browser's site settings or the Home Screen re-checks.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, check]);

  const later = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage blocked: hidden for this visit */
    }
    setHidden(true);
  };

  async function turnOn() {
    setBusy(true);
    try {
      const token = await getValidIdToken();
      if (!token) {
        toast({ tone: "error", title: "Session expired", description: "Sign in again, then retry." });
        return;
      }
      const next = await enablePush(token);
      setState(next);
      if (next === "on") toast({ tone: "success", title: "Alerts are on", description: "Every new enquiry now arrives on this device, even when the app is closed." });
    } catch (error) {
      toast({ tone: "error", title: "Could not turn alerts on", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (mode !== "live" || hidden || !state || !["off", "needs-install", "denied"].includes(state)) return null;

  const laterButton = (
    <Button size="sm" variant="ghost" onClick={later}>
      Later
    </Button>
  );

  if (state === "needs-install") {
    return (
      <Notice tone="neutral" title="Install the app to get alerts on this iPhone" className="mb-4" action={laterButton}>
        <p className="mb-2">iPhone and iPad deliver notifications only to apps on the Home Screen.</p>
        <IosInstallSteps />
      </Notice>
    );
  }

  if (state === "denied") {
    return (
      <Notice tone="warning" title="Notifications are blocked on this device" className="mb-4" action={laterButton}>
        Android: tap the lock or ⋮ menu, then <strong>Site settings → Notifications → Allow</strong>. iPhone: <strong>Settings → Notifications → Brighton Admin → Allow</strong>. Then come back here.
      </Notice>
    );
  }

  return (
    <Notice
      tone="neutral"
      title="Turn on alerts on this device"
      className="mb-4"
      action={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" icon="bell" loading={busy} onClick={() => void turnOn()}>
            Turn on alerts
          </Button>
          {installable ? (
            <Button size="sm" icon="smartphone" onClick={() => void promptInstall()}>
              Install app
            </Button>
          ) : null}
          {laterButton}
        </div>
      }
    >
      Get a notification for every new contact and landing lead, even when the app is closed.
    </Notice>
  );
}
