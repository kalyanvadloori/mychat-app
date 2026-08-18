import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Delivers a push notification to the other person in a conversation.
 *
 * This has to run on a server: sending through FCM requires the project's service
 * account, and anything the browser can see is public. It exists as a Netlify
 * function rather than a Cloud Function because Cloud Functions needs the Blaze
 * plan, while this runs on the free tier alongside the existing Agora endpoint.
 *
 * The client is never trusted with who receives what. It sends only a
 * conversation id; this reads the thread, confirms the caller is in it, and works
 * out the recipient itself. Otherwise the endpoint would push arbitrary text to
 * any user id a caller cared to name.
 */

/** Matches the viewing heartbeat window used by the chat service. */
const VIEWING_TTL_MS = 70_000;
const MAX_BODY = 240;

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

/** Accepts the service account as raw JSON or base64, since env UIs mangle newlines. */
function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function adminApp() {
  if (getApps().length) return getApp();
  const credentials = readServiceAccount();
  if (!credentials) return null;
  return initializeApp({ credential: cert(credentials) });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const app = adminApp();
  if (!app) return json(500, { error: 'Server is missing FIREBASE_SERVICE_ACCOUNT.' });

  const authHeader = event.headers.authorization ?? event.headers.Authorization ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return json(401, { error: 'Missing credentials.' });

  let senderId;
  try {
    ({ uid: senderId } = await getAuth(app).verifyIdToken(idToken));
  } catch {
    return json(401, { error: 'Invalid credentials.' });
  }

  let conversationId;
  let text;
  try {
    ({ conversationId, text } = JSON.parse(event.body ?? '{}'));
  } catch {
    return json(400, { error: 'Malformed request body.' });
  }
  if (typeof conversationId !== 'string' || !conversationId) {
    return json(400, { error: 'conversationId is required.' });
  }

  const db = getFirestore(app);
  const conversation = await db.collection('conversations').doc(conversationId).get();
  if (!conversation.exists) return json(404, { error: 'No such conversation.' });

  const data = conversation.data();
  const participants = data.participantIds ?? [];
  if (!participants.includes(senderId)) return json(403, { error: 'Not your conversation.' });

  const recipientId = participants.find((id) => id !== senderId);
  if (!recipientId) return json(204, {});

  // Muted threads and threads the recipient is currently reading get nothing.
  if (data.muted?.[recipientId] === true) return json(204, { skipped: 'muted' });

  const viewingAt = data.viewingAt?.[recipientId];
  const viewingMs = viewingAt?.toMillis?.() ?? 0;
  if (data.viewing?.[recipientId] === true && Date.now() - viewingMs < VIEWING_TTL_MS) {
    return json(204, { skipped: 'viewing' });
  }

  const tokensSnap = await db.collection('users').doc(recipientId).collection('pushTokens').get();
  const tokens = tokensSnap.docs.map((entry) => entry.id);
  if (!tokens.length) return json(204, { skipped: 'no-devices' });

  const senderDoc = await db.collection('users').doc(senderId).get();
  const senderName = senderDoc.data()?.name || 'New message';

  const body = typeof text === 'string' && text.trim() ? text.slice(0, MAX_BODY) : 'Sent you a message';

  // Data-only: a `notification` block would be rendered by the browser before the
  // service worker could decide whether the app is already on screen.
  const response = await getMessaging(app).sendEachForMulticast({
    tokens,
    data: { title: senderName, body, conversationId },
    webpush: {
      headers: { Urgency: 'high', TTL: '600' },
      fcmOptions: { link: '/' },
    },
  });

  // Tokens die when the browser is uninstalled or its storage cleared. Left in
  // place they are retried on every message forever, so failures are pruned.
  const dead = [];
  response.responses.forEach((result, index) => {
    const code = result.error?.code ?? '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      dead.push(tokens[index]);
    }
  });

  await Promise.all(
    dead.map((token) =>
      db
        .collection('users')
        .doc(recipientId)
        .collection('pushTokens')
        .doc(token)
        .delete()
        .catch(() => {}),
    ),
  );

  return json(200, { sent: response.successCount, failed: response.failureCount, pruned: dead.length });
}
