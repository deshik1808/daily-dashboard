// worker/index.js
// Custom Service Worker logic compiled by @ducanh2912/next-pwa into worker-[hash].js
// Handles Web Push notifications and notification clicks.

/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Update", body: event.data.text() };
  }

  const title = data.title || "Project Status";
  const options = {
    body: data.body || "The dashboard has been updated.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "dashboard-update",
    renotify: true,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// The browser can expire or rotate a subscription on its own. Re-subscribe
// and tell the server, or this device silently stops receiving pushes.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch("/api/push");
      if (!res.ok) return;
      const { publicKey } = await res.json();
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const raw = atob((publicKey + padding).replace(/-/g, "+").replace(/_/g, "/"));
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
      });
      const json = sub.toJSON();
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });
      if (event.oldSubscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: event.oldSubscription.endpoint }),
        });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
