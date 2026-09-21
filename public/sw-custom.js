// public/sw-custom.js
// Custom Service Worker additions merged with the workbox-generated SW.
// Handles Web Push events so the Viewer receives notifications when
// the Editor logs new data.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Update", body: event.data.text() };
  }

  const title = data.title ?? "Project Status";
  const options = {
    body: data.body ?? "The dashboard has been updated.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "dashboard-update",        // Replace previous notification of same type
    renotify: true,                 // Still vibrate even when replacing
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open, focus it and navigate.
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Otherwise open a new window.
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
