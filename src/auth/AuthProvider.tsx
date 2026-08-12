import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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

      async signIn(email, password) {
        await signInWithEmailAndPassword(auth(), email, password);
      },

      async register(name, email, password) {
        const credential = await createUserWithEmailAndPassword(auth(), email, password);
        await updateProfile(credential.user, { displayName: name });
        // onAuthStateChanged already fired without the display name, so push the fresh object.
        setUser({ ...credential.user, displayName: name } as FirebaseUser);
      },

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
