'use client';
import {
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase/provider';

export { type User };

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (auth: Auth, firestore: ReturnType<typeof useFirestore>) => {
  if (!auth || !firestore) {
    console.error("Firebase auth or firestore not available for sign in");
    return;
  };

  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Error starting redirect sign-in: ', error);
  }
};


export const signOut = async (auth: Auth) => {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
  }
};

export { useUser } from '@/firebase/provider';
