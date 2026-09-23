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

export interface PushResult {
  /** Subscriptions matched (all devices, or the one `endpoint` asked for). */
  targeted: number;
  delivered: number;
  /** Stale subscriptions (404/410) that were pruned. */
  removed: number;
  failed: number;
  error?: string;
}

/**
 * Fetches push subscriptions from the database and sends `payload` to each
 * one — or only to `endpoint` when given (used by the per-device test).
 * Stale subscriptions (410 Gone) are pruned automatically.
 *
 * Safe to fire-and-forget inside `after()` — errors are logged and reported
 * in the result, never re-thrown.
 */
export async function sendPushNotification(
  payload: PushPayload,
  { endpoint }: { endpoint?: string } = {}
): Promise<PushResult> {
  const result: PushResult = { targeted: 0, delivered: 0, removed: 0, failed: 0 };

  const vapid = getVapidConfig();
  if (!vapid) {
    console.warn("[push] VAPID env vars not set — skipping push notification");
    return { ...result, error: "VAPID keys not configured" };
  }

  webpush.setVapidDetails(vapid.mailto, vapid.publicKey, vapid.privateKey);

  const supabase = createServiceClient();
  let query = supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (endpoint) query = query.eq("endpoint", endpoint);
  const { data: subscriptions, error } = await query;

  if (error) {
    console.error("[push] Failed to fetch subscriptions:", error);
    return { ...result, error: "Could not read subscriptions" };
  }

  result.targeted = subscriptions?.length ?? 0;
  if (!subscriptions || subscriptions.length === 0) {
    console.info("[push] No subscriptions to notify");
    return result;
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
          // 24 h TTL — deliver even if device is offline; high urgency so
          // Android doesn't hold it back while the phone is dozing.
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        result.delivered++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription has expired/unsubscribed — remove it.
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          result.removed++;
          console.info(`[push] Removed stale subscription: ${sub.id}`);
        } else {
          result.failed++;
          console.error(`[push] Failed to send to ${sub.id}:`, err);
        }
      }
    })
  );

  console.info("[push] Result:", result);
  return result;
}
