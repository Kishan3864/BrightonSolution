/**
 * BrightonSolution Cloud Functions: instant push alerts to the admin app.
 *
 * Every new document in contacts/ (website contact form) and leads/ (private landing page) is pushed
 * to each subscribed admin device (pushSubscriptions/, saved by the admin app, see
 * components/admin/data/push.ts) with the same wording as the in-app alerts: notify.js is generated
 * from components/admin/data/notify.ts by scripts/sync-functions-notify.mjs before each deploy.
 * A pushTests/ document (admin-only, Settings > Send test push) sends a sample alert, then is deleted.
 * Subscriptions the push service reports as gone (404/410) are deleted.
 *
 * Web Push with VAPID; the private key is the VAPID_PRIVATE_KEY secret
 * (firebase functions:secrets:set VAPID_PRIVATE_KEY). Logs never contain enquiry contents.
 */
import { logger, setGlobalOptions } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";
import { contactNotification, leadNotification } from "./notify.js";

/** Public half of the VAPID pair; same value as VAPID_PUBLIC_KEY in components/admin/data/push.ts. */
const VAPID_PUBLIC_KEY = "BM4gSoV2wasXy-IwufVRprEhL_8tuhF6rRlroYTu9Nsq5ReJabfukqVmdQ8GUUvJJ14p4tvGy0-_05TiwKpcPks";
const VAPID_SUBJECT = "mailto:support@brightonsolution.com";
const vapidPrivateKey = defineSecret("VAPID_PRIVATE_KEY");

/** A push the phone has not received within a day is dropped. */
const TTL_SECONDS = 24 * 3600;

// Same region as the Firestore database (asia-south1).
setGlobalOptions({ region: "asia-south1", maxInstances: 10, memory: "256MiB", timeoutSeconds: 60 });

initializeApp();
const db = getFirestore();

/** Firestore data with Timestamps turned into Dates (notify.js expects createdAt as a Date). */
function plain(data, id) {
  const out = { ...data, id };
  for (const [key, value] of Object.entries(out)) {
    if (value && typeof value.toDate === "function") out[key] = value.toDate();
  }
  return out;
}

async function pushToAll(payload) {
  const subscriptions = await db.collection("pushSubscriptions").get();
  if (subscriptions.empty) {
    logger.info("No devices subscribed to push", { tag: payload.tag });
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, vapidPrivateKey.value());
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.docs.map(async (doc) => {
      const { endpoint, p256dh, auth } = doc.data();
      try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, body, { TTL: TTL_SECONDS, urgency: "high" });
        return "sent";
      } catch (error) {
        const status = error && typeof error === "object" ? error.statusCode : undefined;
        if (status === 404 || status === 410) {
          await doc.ref.delete();
          return "expired";
        }
        logger.warn("Push failed", { device: doc.id, status: status ?? null });
        throw error;
      }
    }),
  );
  const count = (value) => results.filter((result) => result.status === "fulfilled" && result.value === value).length;
  logger.info("Push delivered", {
    tag: payload.tag,
    devices: subscriptions.size,
    sent: count("sent"),
    expired: count("expired"),
    failed: results.filter((result) => result.status === "rejected").length,
  });
}

const trigger = (document) => ({ document, secrets: [vapidPrivateKey], retry: false });

export const pushNewLead = onDocumentCreated(trigger("leads/{id}"), async (event) => {
  if (!event.data) return;
  await pushToAll(leadNotification(plain(event.data.data(), event.params.id)));
});

export const pushNewContact = onDocumentCreated(trigger("contacts/{id}"), async (event) => {
  if (!event.data) return;
  await pushToAll(contactNotification(plain(event.data.data(), event.params.id)));
});

export const pushTest = onDocumentCreated(trigger("pushTests/{id}"), async (event) => {
  const sample = leadNotification({
    id: "test",
    kind: "plan",
    name: "Test enquiry",
    company: "BrightonSolution",
    plan: "Growth",
    price: 79999,
    currency: "INR",
    phone: "+91 98765 43210",
    email: "test@example.com",
    contactPref: "WhatsApp",
    createdAt: new Date(),
  });
  await pushToAll({
    ...sample,
    title: `Test · ${sample.title}`,
    tag: `test-${event.params.id}`,
    data: { url: "#/settings", kind: "summary", id: "" },
    actions: [{ action: "open", title: "Open admin" }],
  });
  await event.data?.ref.delete().catch(() => undefined);
});
