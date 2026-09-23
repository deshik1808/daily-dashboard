// lib/push.ts
// Server-only. Sends a Web Push notification to every subscribed device.
// Called from server actions via next/server's `after()` so it never blocks
// the Editor's save response.

import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

// Configure VAPID once (module-level, evaluated lazily in the edge/node runtime).
function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const rawMailto = process.env.VAPID_MAILTO || "admin@daily-dashboard.vercel.app";
  const mailto = rawMailto.startsWith("mailto:") ? rawMailto : `mailto:${rawMailto}`;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, mailto };
}

export interface PushPayload {
  title: string;
  body: string;
  /** Relative URL to open when the notification is clicked. */
  url?: string;
}

/**
 * Fetches every push subscription from the database and sends `payload` to
 * each one. Stale subscriptions (410 Gone) are pruned automatically.
 *
 * Safe to fire-and-forget inside `after()` — errors are logged but never
 * re-thrown.
 */
export async function sendPushNotification(payload: PushPayload): Promise<void> {
  const vapid = getVapidConfig();
  if (!vapid) {
    console.warn("[push] VAPID env vars not set — skipping push notification");
    return;
  }

  webpush.setVapidDetails(vapid.mailto, vapid.publicKey, vapid.privateKey);

  const supabase = createServiceClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("[push] Failed to fetch subscriptions:", error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.warn("[push] No subscribed devices — nothing to send");
    return;
  }

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 } // 24 h TTL — deliver even if device is offline
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 410/404: device unsubscribed. 403: subscription was created with a
        // different VAPID key and can never succeed — drop it so the device
        // re-subscribes with the current key next time the app opens.
        if (status === 410 || status === 404 || status === 403) {
          // Subscription has expired/unsubscribed — remove it.
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          console.info(`[push] Removed stale subscription: ${sub.id}`);
        } else {
          const detail = (err as { body?: string }).body;
          console.error(`[push] Failed to send to ${sub.id} (status ${status}):`, detail ?? err);
        }
      }
    })
  );
}
