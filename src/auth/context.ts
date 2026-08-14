import { createContext, useContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

export interface AuthValue {
  /** null while signed out; undefined while the initial auth check is still running. */
  user: FirebaseUser | null | undefined;
  /** False when no Firebase keys are present — the app then runs on the mock backend. */
  enabled: boolean;
  signInWithGoogle(): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** Turns Firebase error codes into something a person can read. */
export function authErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return 'This site is not authorised in the Firebase console yet.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in the Firebase console yet.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection.';
    default:
      return (error as Error)?.message ?? 'Something went wrong. Please try again.';
  }
}
