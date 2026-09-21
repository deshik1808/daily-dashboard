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
