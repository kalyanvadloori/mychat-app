// `agora-token` is CommonJS, and Node cannot reliably detect its named exports
// from an ESM file — importing them directly yields `undefined` at runtime.
// Taking the default export and destructuring it is the interop that works.
import agoraToken from 'agora-token';

const { RtcRole, RtcTokenBuilder } = agoraToken;

/**
 * Mints short-lived Agora tokens.
 *
 * This exists because the App Certificate must never reach the browser: anything
 * Vite can see ends up inside the bundle, and whoever holds the certificate can
 * mint tokens for any channel on the account. So the certificate lives only here,
 * in Netlify's server-side environment, and the browser asks for a token per call.
 *
 * Callers must present a Firebase ID token, verified against Firebase before a
 * token is issued — otherwise this endpoint would be a free calling service for
 * anyone who found the URL.
 */

const TOKEN_TTL_SECONDS = 60 * 60; // One hour is far longer than any call.

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

/** Confirms the caller is a real signed-in user of *this* Firebase project. */
async function verifyFirebaseUser(idToken, apiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.users?.[0]?.localId ?? null;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const appId = process.env.VITE_AGORA_APP_ID ?? process.env.AGORA_APP_ID;
  const certificate = process.env.AGORA_APP_CERTIFICATE;
  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;

  if (!appId || !certificate || !firebaseApiKey) {
    return json(500, { error: 'Server is missing Agora or Firebase configuration.' });
  }

  let channel;
  let uid;
  try {
    ({ channel, uid } = JSON.parse(event.body ?? '{}'));
  } catch {
    return json(400, { error: 'Malformed request body.' });
  }

  if (typeof channel !== 'string' || !channel || typeof uid !== 'number') {
    return json(400, { error: 'channel (string) and uid (number) are required.' });
  }

  const authHeader = event.headers.authorization ?? event.headers.Authorization ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return json(401, { error: 'Missing credentials.' });

  const firebaseUid = await verifyFirebaseUser(idToken, firebaseApiKey);
  if (!firebaseUid) return json(401, { error: 'Invalid credentials.' });

  // Both arguments are durations in seconds from now, NOT absolute timestamps —
  // passing an epoch here asks for a privilege expiring decades away, which
  // Agora rejects as malformed.
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    channel,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
  );

  return json(200, {
    token,
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
}
