// components/PushSubscription.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Web Push subscription, in two pieces that share the helpers below:
 *
 * - `PushSubscription` (mounted once in the root layout): if permission is
 *   already granted it silently re-syncs this device's subscription on every
 *   visit; otherwise it shows a one-time prompt banner so a genuine user
 *   gesture can trigger Notification.requestPermission() (required by iOS
 *   Safari and modern Android Chrome).
 * - `NotificationBell` (Home top bar): the always-available way back in. The
 *   banner can be dismissed for good, so without this a device that never
 *   subscribed had no path to turn notifications on or check they work.
 */
export function PushSubscription() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPushSupported()) return;

    readDeviceState().then((state) => {
      if (Notification.permission === "granted") {
        // Re-sync on every visit: Chrome can rotate a device's subscription,
        // and the server only knows about endpoints it has been told.
        subscribeDevice(false).catch(() => {});
      } else if (state === "off") {
        let dismissed = false;
        try {
          dismissed = localStorage.getItem("push_prompt_dismissed") === "true";
        } catch {}
        if (!dismissed) setBannerVisible(true);
      }
    });
  }, []);

  function handleEnable() {
    startTransition(async () => {
      const outcome = await subscribeDevice(true);
      setStatusMessage(outcome.message);
      if (outcome.ok) {
        setIsSubscribed(true);
        setTimeout(() => setBannerVisible(false), 3000);
      }
    });
  }

  function handleDismiss() {
    setBannerVisible(false);
    try {
      localStorage.setItem("push_prompt_dismissed", "true");
    } catch {}
  }

  if (!bannerVisible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md border border-ink bg-mist p-3.5 font-mono text-xs shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none select-none">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink">Enable Push Notifications</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Receive instant alerts whenever the Editor logs new daily progress entries.
            You can change this later from the bell on the Home screen.
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
  );
}

type DeviceState = "unsupported" | "blocked" | "off" | "on";

export function NotificationBell() {
  const [state, setState] = useState<DeviceState | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    readDeviceState().then(setState);
  }, []);

  // Close the panel on an outside tap.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function handleEnable() {
    startTransition(async () => {
      const outcome = await subscribeDevice(true);
      setMessage(outcome.message);
      setState(await readDeviceState());
    });
  }

  function handleTest() {
    startTransition(async () => {
      setMessage(null);
      // Re-sync first so the test goes to the subscription this device holds now.
      const synced = await subscribeDevice(false);
      if (!synced.ok || !synced.endpoint) {
        setMessage(synced.message);
        return;
      }
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: synced.endpoint }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      setMessage(
        res?.ok
          ? "Test sent. If nothing appears within a minute, check Android Settings → Apps → Chrome → Notifications."
          : `Test failed: ${data.error ?? "network error"}.`
      );
    });
  }

  if (state === null || state === "unsupported") return null;

  const label =
    state === "on"
      ? "Notifications on"
      : state === "blocked"
        ? "Notifications blocked"
        : "Notifications off";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        // Solid mist backing + side padding so the icon sits in a gap in the
        // hatch rule instead of on top of its lines.
        className="relative inline-flex items-center justify-center bg-mist px-1.5 py-0.5 text-ink transition-opacity hover:opacity-70 active:opacity-50"
      >
        <BellIcon muted={state !== "on"} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 border border-ink bg-mist p-3 font-mono text-[11px] font-normal tracking-normal shadow-lg">
          <p className="font-bold text-ink">{label.toUpperCase()}</p>
          <p className="mt-1 leading-relaxed text-muted">
            {state === "on" &&
              "This device will get an alert whenever a new entry is logged."}
            {state === "off" && "Turn on to get an alert whenever a new entry is logged."}
            {state === "blocked" &&
              "Notifications are blocked for this site. Tap the lock icon in the address bar → Permissions → Notifications → Allow, then reload."}
          </p>

          {message && <p className="mt-2 font-bold text-accent-ink">{message}</p>}

          <div className="mt-3 flex items-center gap-2">
            {state === "off" && (
              <button
                type="button"
                onClick={handleEnable}
                disabled={isPending}
                className="rounded-control bg-ink px-3 py-1.5 font-bold text-paper transition-transform active:scale-95 disabled:opacity-50"
              >
                {isPending ? "Connecting..." : "Turn On"}
              </button>
            )}
            {state === "on" && (
              <button
                type="button"
                onClick={handleTest}
                disabled={isPending}
                className="rounded-control bg-ink px-3 py-1.5 font-bold text-paper transition-transform active:scale-95 disabled:opacity-50"
              >
                {isPending ? "Sending..." : "Send Test"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block h-5 w-5 shrink-0"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" fill={muted ? "none" : "var(--color-mist)"} />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      {muted && <path d="m2 2 20 20" />}
    </svg>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn("[PushSubscription] Service worker error:", err);
    return null;
  }
}

async function readDeviceState(): Promise<DeviceState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/**
 * Ensures this device holds a push subscription and the server has it.
 * Only prompts for permission when `userGesture` is true.
 */
async function subscribeDevice(
  userGesture: boolean
): Promise<{ ok: boolean; message: string; endpoint?: string }> {
  try {
    if (!isPushSupported()) return { ok: false, message: "Push is not supported on this browser." };

    const keyRes = await fetch("/api/push");
    if (!keyRes.ok) return { ok: false, message: "Push not configured on server." };
    const { publicKey } = await keyRes.json();
    if (!publicKey) return { ok: false, message: "Missing VAPID key." };

    let perm = Notification.permission;
    if (perm !== "granted" && userGesture) perm = await Notification.requestPermission();
    if (perm === "denied") return { ok: false, message: "Notifications blocked in browser settings." };
    if (perm !== "granted") return { ok: false, message: "Permission not granted." };

    const registration = await getRegistration();
    if (!registration) return { ok: false, message: "Service worker unavailable." };

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let sub = await registration.pushManager.getSubscription();
    // A subscription made with a different VAPID key can never be delivered
    // to — replace it rather than silently re-registering a dead endpoint.
    if (sub && !sameKey(sub.options.applicationServerKey, applicationServerKey)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    const res = await syncSubscription(sub);
    if (!res.ok) return { ok: false, message: "Failed to register subscription on server." };
    return { ok: true, message: "Subscribed! Device is ready for notifications.", endpoint: sub.endpoint };
  } catch (err) {
    console.error("[PushSubscription] Subscribe error:", err);
    return { ok: false, message: "Could not subscribe device." };
  }
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return true; // Browser didn't expose it — assume it's ours.
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
