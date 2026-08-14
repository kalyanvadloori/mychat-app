/**
 * Desktop/mobile notifications for messages that arrive while you are elsewhere.
 *
 * Deliberately the plain Notification API rather than Firebase Cloud Messaging:
 * FCM would deliver notifications with the app fully closed, but sending them
 * needs a server, and Cloud Functions requires the paid plan. This works whenever
 * the app is open — including in a background tab or another window — for free.
 */

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function notificationPermission(): NotifyPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Must be called from a user gesture — browsers reject a silent request. */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

interface NotifyOptions {
  title: string;
  body: string;
  /** Same tag replaces the previous notification instead of stacking them. */
  tag: string;
  onClick?: () => void;
}

export function showNotification({ title, body, tag, onClick }: NotifyOptions) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      // Replacing an existing notification should not buzz the phone again.
      renotify: false,
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}
