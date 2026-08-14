import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { AuthContext, type AuthValue } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null | undefined>(
    isFirebaseConfigured ? undefined : null,
  );

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), (next) => setUser(next));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      enabled: isFirebaseConfigured,

      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        // Signing out of Firebase does not sign you out of Google, so without
        // this Google silently reuses the last account and skips the chooser.
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth(), provider);
      },

      async logout() {
        await signOut(auth());
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
