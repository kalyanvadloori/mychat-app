/*
 * Background push handler.
 *
 * This file must live in `public/` and be served from the site root: a service
 * worker can only control pages at or below its own path, and the app needs it to
 * cover everything.
 *
 * It cannot read `import.meta.env` — a service worker is not part of the Vite
 * module graph — so the Firebase config is passed as a query string when the page
 * registers it, and read back off `self.location` here. None of those values are
 * secret; they ship in the client bundle either way.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

/** Takes over already-open tabs instead of waiting for every one of them to close. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

/** True when a tab is open *and* on screen, in which case the app notifies itself. */
async function appIsVisible() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.some((client) => client.visibilityState === 'visible');
}

/**
 * Messages are sent data-only, so nothing is displayed until this runs. A payload
 * carrying a `notification` block would be shown by the browser automatically and
 * we would have no chance to suppress it.
 */
messaging.onBackgroundMessage((payload) => {
  const data = payload.data ?? {};

  return appIsVisible().then((visible) => {
    // The open app already raises its own notification from the Firestore stream.
    // Showing this one too would give the same message twice.
    if (visible) return;

    return self.registration.showNotification(data.title || 'New message', {
      body: data.body || '',
      // Same tag replaces the previous notification for that thread rather than
      // stacking one per message.
      tag: data.conversationId || 'mychat',
      renotify: true,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { conversationId: data.conversationId || '' },
    });
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const conversationId = event.notification.data?.conversationId ?? '';
  const target = conversationId ? `/?chat=${encodeURIComponent(conversationId)}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Prefer focusing a tab that is already open over opening another one.
      for (const client of windows) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-conversation', conversationId });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
