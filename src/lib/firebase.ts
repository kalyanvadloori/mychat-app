import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * True once the .env file holds real keys. Until then the app falls back to the
 * mock backend, so `npm run dev` keeps working with no configuration at all.
 */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

function ensureApp() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured — copy .env.example to .env and fill in the keys.');
  }
  if (!app) app = initializeApp(config);
  return app;
}

export function auth() {
  if (!authInstance) authInstance = getAuth(ensureApp());
  return authInstance;
}

export function db() {
  if (!dbInstance) dbInstance = getFirestore(ensureApp());
  return dbInstance;
}
