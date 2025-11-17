'use client';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '..';
import { doc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export { type User };

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const auth = useAuth();
  if (!auth) return;
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Error signing in with Google: ', error);
  }
};

export const signOut = async () => {
  const auth = useAuth();
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
  }
};

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Create or update user profile in Firestore
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        }, { merge: true });

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, loading };
}
