// components/PushSubscription.tsx
"use client";

import { useEffect, useRef } from "react";

/**
 * Silent background component that:
 * 1. Fetches the VAPID public key from the server.
 * 2. Subscribes this browser to Web Push (requesting permission once).
 * 3. Saves the subscription to /api/push.
 *
 * On subsequent visits the existing subscription is silently re-synced.
 * Renders nothing visible — place in the root layout.
 */
export function PushSubscription() {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    subscribed.current = true;

    async function subscribe() {
      try {
        // Fetch the VAPID public key
        const keyRes = await fetch("/api/push");
        if (!keyRes.ok) return; // Not configured — skip silently
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        const registration = await navigator.serviceWorker.ready;

        // Check existing subscription first
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // Re-sync to ensure DB has it (handles reinstalls)
          await syncSubscription(existing);
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });

        await syncSubscription(subscription);
      } catch (err) {
        console.warn("[PushSubscription] Could not subscribe:", err);
      }
    }

    subscribe();
  }, []);

  // Nothing rendered — purely background behaviour.
  return null;
}

async function syncSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) return;
  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });
}

/** Convert a URL-safe base64 string to a Uint8Array for applicationServerKey. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}


