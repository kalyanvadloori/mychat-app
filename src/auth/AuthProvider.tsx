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
        await signInWithPopup(auth(), new GoogleAuthProvider());
      },

      async logout() {
        await signOut(auth());
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
