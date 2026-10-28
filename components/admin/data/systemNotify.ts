"use client";

import type { NotificationPayload } from "./notify";

/**
 * Browser side of enquiry alerts: permission state, the permission prompt and showing a system
 * notification. Prefers the service worker registration (required on Android, and what the PWA
 * will use for background push), falling back to the page-level Notification constructor.
 * Note: public/sw.js has no "notificationclick" handler yet (PWA phase); the fallback notification
 * opens the route itself on click.
 */

export type NotifyPermission = NotificationPermission | "unsupported";

export function notificationPermission(): NotifyPermission {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows the notification when permission is granted; resolves false when it could not be shown. */
export async function showSystemNotification(payload: NotificationPayload): Promise<boolean> {
  if (notificationPermission() !== "granted") return false;
  const options: NotificationOptions & { timestamp?: number; renotify?: boolean } = {
    body: payload.body,
    tag: payload.tag,
    icon: payload.icon,
    badge: payload.badge,
    data: payload.data,
    timestamp: payload.timestamp,
    renotify: false,
  };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(payload.title, options);
        return true;
      }
    }
  } catch {
    /* fall through to the page-level notification */
  }
  try {
    const note = new Notification(payload.title, options);
    note.onclick = () => {
      try {
        window.focus();
        window.location.hash = payload.data.url;
      } catch {
        /* the tab is gone */
      }
      note.close();
    };
    return true;
  } catch {
    return false;
  }
}
