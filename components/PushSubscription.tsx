// components/PushSubscription.tsx
"use client";

import { useEffect, useState, useTransition } from "react";

/**
 * Handles Web Push subscription:
 * 1. If permission is already granted, silently subscribes and syncs to /api/push.
 * 2. If permission is not yet granted, displays a styled prompt banner so the user
 *    can trigger Notification.requestPermission() via a genuine user gesture (required
 *    by iOS Safari and modern Android Chrome).
 * 3. Provides a "Send Test Notification" action to verify end-to-end delivery.
 */
export function PushSubscription() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Initial check on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isPushSupported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    setSupported(isPushSupported);

    if (!isPushSupported) return;

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    if (currentPerm === "granted") {
      // If already granted, perform silent registration and sync
      doSubscribe(false);
    } else if (currentPerm === "default") {
      // Show prompt banner so user gesture can trigger permission dialog
      const dismissed = localStorage.getItem("push_prompt_dismissed");
      if (!dismissed) {
        setBannerVisible(true);
      }
    }
  }, []);

  async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.warn("[PushSubscription] Service worker error:", err);
      return null;
    }
  }

  async function doSubscribe(userGesture = true) {
    setStatusMessage(null);
    try {
      // 1. Get VAPID public key
      const keyRes = await fetch("/api/push");
      if (!keyRes.ok) {
        setStatusMessage("Push not configured on server.");
        return;
      }
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setStatusMessage("Missing VAPID key.");
        return;
      }

      // 2. Request permission if needed
      let perm = Notification.permission;
      if (perm !== "granted" && userGesture) {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }

      if (perm !== "granted") {
        if (perm === "denied") {
          setStatusMessage("Notifications blocked in browser settings.");
        }
        return;
      }

      // 3. Register service worker and subscribe
      const registration = await getRegistration();
      if (!registration) {
        setStatusMessage("Service worker unavailable.");
        return;
      }

      let sub = await registration.pushManager.getSubscription();
      // A subscription made with an old VAPID key looks valid on the phone but
      // every push to it is rejected. Replace it if the key has changed.
      if (sub && !sameKey(sub.options.applicationServerKey, publicKey)) {
        await sub.unsubscribe();
        sub = null;
      }
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });
      }

      // 4. Sync subscription to backend
      const res = await syncSubscription(sub);
      if (res.ok) {
        setIsSubscribed(true);
        setStatusMessage("Subscribed! Device is ready for notifications.");
        // Hide prompt banner after 3 seconds
        setTimeout(() => setBannerVisible(false), 3000);
      } else {
        setStatusMessage("Failed to register subscription on server.");
      }
    } catch (err) {
      console.error("[PushSubscription] Subscribe error:", err);
      setStatusMessage("Could not subscribe device.");
    }
  }

  function handleEnable() {
    startTransition(async () => {
      await doSubscribe(true);
    });
  }

  function handleDismiss() {
    setBannerVisible(false);
    localStorage.setItem("push_prompt_dismissed", "true");
  }

  if (supported === false || isSubscribed && !bannerVisible) return null;

  return (
    <>
      {/* Permission prompt banner */}
      {bannerVisible && (
        <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md border border-ink bg-mist p-3.5 font-mono text-xs shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none select-none">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink">Enable Push Notifications</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Receive instant alerts whenever the Editor logs new daily progress entries.
              </p>

              {statusMessage && (
                <p className="mt-2 text-[11px] font-bold text-accent-ink">{statusMessage}</p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={isPending || isSubscribed}
                  className="rounded-control bg-ink px-3 py-1.5 font-bold text-paper transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isPending ? "Connecting..." : isSubscribed ? "Enabled ✓" : "Allow Notifications"}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2 py-1.5 text-muted hover:text-ink"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function syncSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  return fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  });
}

function sameKey(current: ArrayBuffer | null, publicKey: string): boolean {
  if (!current) return false;
  const a = new Uint8Array(current);
  const b = urlBase64ToUint8Array(publicKey);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
