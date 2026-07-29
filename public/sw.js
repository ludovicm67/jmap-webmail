/* JMAP Webmail service worker — handles Web Push for JMAP StateChange delivery. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  // JMAP sends a PushVerification first; relay its code to the page so it can
  // confirm the subscription, and don't show a notification for it.
  if (data['@type'] === 'PushVerification' || data.verificationCode) {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clients) => {
          clients.forEach((client) =>
            client.postMessage({
              type: 'jmap-push-verification',
              pushSubscriptionId: data.pushSubscriptionId,
              verificationCode: data.verificationCode,
            }),
          );
        }),
    );
    return;
  }

  // Otherwise it's a StateChange — tell the user something arrived.
  event.waitUntil(
    self.registration.showNotification('JMAP Webmail', {
      body: 'You have new activity in your mailbox.',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'jmap-statechange',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const client = clients[0];
        if (client) return client.focus();
        return self.clients.openWindow('/');
      }),
  );
});
