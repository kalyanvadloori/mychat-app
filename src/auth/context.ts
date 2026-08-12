import { createContext, useContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

export interface AuthValue {
  /** null while signed out; undefined while the initial auth check is still running. */
  user: FirebaseUser | null | undefined;
  /** False when no Firebase keys are present — the app then runs on the mock backend. */
  enabled: boolean;
  signIn(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
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
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in the Firebase console yet.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection.';
    default:
      return (error as Error)?.message ?? 'Something went wrong. Please try again.';
  }
}
