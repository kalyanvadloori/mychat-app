import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, config, db, firebaseApp, isFirebaseConfigured } from './firebase';
import { requestNotificationPermission, type NotifyPermission } from '../utils/notify';

/**
 * Web push, so messages arrive with the app closed.
 *
 * The plain Notification API in `utils/notify.ts` only fires while a tab is
 * alive; this is the other half. A device registers an FCM token, the token is
 * stored under the owner's profile, and the `send-push` function delivers to it
 * from the server. The two paths are kept from doubling up in the service worker,
 * which suppresses its notification whenever a visible tab exists.
 */

/** From Firebase console → Project settings → Cloud Messaging → Web Push certificates. */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Push needs its own key on top of the ordinary Firebase config. */
export const isPushConfigured = Boolean(isFirebaseConfigured && VAPID_KEY);

/** The token registered by this browser, kept so it can be revoked on sign-out. */
let currentToken: string | null = null;

/**
 * Registers the background handler.
 *
 * The config travels as a query string because a service worker cannot read the
 * bundle's environment variables. The URL doubles as the worker's identity, so
 * keeping the parameters stable matters — a different query string would register
 * a second worker rather than update the first.
 */
async function registerWorker() {
  const params = new URLSearchParams(
    Object.entries(config).filter(([, value]) => Boolean(value)) as [string, string][],
  );
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: '/',
  });
}

function tokenDoc(uid: string, token: string) {
  return doc(db(), 'users', uid, 'pushTokens', token);
}

/**
 * Asks for permission, then registers this device for push.
 *
 * Returns the resulting permission either way: a browser that cannot do push, or
 * a project without a VAPID key, still gets ordinary in-tab notifications, so a
 * failure here is not a failure of the feature the user asked for.
 */
export async function enablePush(): Promise<NotifyPermission> {
  // Must come from the click that called this — browsers reject silent requests.
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return permission;

  if (!isPushConfigured || !(await isSupported().catch(() => false))) return permission;

  try {
    const user = auth().currentUser;
    if (!user) return permission;

    const registration = await registerWorker();
    const token = await getToken(getMessaging(firebaseApp()), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return permission;

    currentToken = token;
    // The token is the document id, so re-registering the same browser updates
    // one row rather than accumulating a new one on every sign-in.
    await setDoc(tokenDoc(user.uid, token), {
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 300),
    });
  } catch (error) {
    // Push failing must not take the permission grant down with it.
    console.warn('[push] could not register this device:', error);
  }

  return permission;
}

/**
 * Re-registers a device that was granted permission on an earlier visit.
 *
 * FCM tokens rotate, and a stale one silently stops receiving anything, so this
 * runs on every sign-in rather than only the first.
 */
export async function refreshPushRegistration() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!isPushConfigured) return;
  await enablePush();
}

/**
 * Revokes this device's token. Called on sign-out: without it the next person to
 * use this browser would receive the previous account's messages.
 */
export async function disablePush() {
  if (!isPushConfigured) return;

  const user = auth().currentUser;
  try {
    if (user && currentToken) await deleteDoc(tokenDoc(user.uid, currentToken));
    if (await isSupported().catch(() => false)) {
      await deleteToken(getMessaging(firebaseApp())).catch(() => {});
    }
  } catch {
    // A token we cannot revoke is pruned server-side on its first failed send.
  }
  currentToken = null;
}

/**
 * Opens the thread a notification was tapped on. The service worker focuses an
 * existing tab and posts the id to it rather than opening a second copy of the app.
 */
export function onNotificationNavigate(handler: (conversationId: string) => void) {
  if (!('serviceWorker' in navigator)) return () => {};

  const listener = (event: MessageEvent) => {
    if (event.data?.type === 'open-conversation' && event.data.conversationId) {
      handler(event.data.conversationId as string);
    }
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}
