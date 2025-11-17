'use client';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  signInAnonymously,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '..';
import { doc, setDoc, getDoc, writeBatch, collection, getDocs, query, limit } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export { type User };

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (auth: Auth, firestore: ReturnType<typeof useFirestore>) => {
  if (!auth || !firestore) return;
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const batch = writeBatch(firestore);
      
      // 1. Create user profile document
      batch.set(userRef, {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        stickyNote: '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.',
      }, { merge: true });

      // 2. Add initial recipes
      const recipesCollectionRef = collection(firestore, 'users', user.uid, 'recipes');
      INITIAL_RECIPES.forEach(recipe => {
        const recipeRef = doc(recipesCollectionRef);
        batch.set(recipeRef, { ...recipe, id: recipeRef.id });
      });

      // 3. Add initial week plan
      const weekPlanCollectionRef = collection(firestore, 'users', user.uid, 'weekPlan');
      INITIAL_WEEK_PLAN.forEach(dayPlan => {
        const dayRef = doc(weekPlanCollectionRef, dayPlan.day);
        batch.set(dayRef, dayPlan);
      });

      batch.commit().catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `/users/${user.uid}`,
              operation: 'write',
              requestResourceData: { note: 'Initial user setup batch write.' }
          }));
      });
    }
  } catch (error: any) {
    console.error('Error signing in with Google: ', error);
    // If Google sign-in is not allowed, fall back to anonymous sign-in
    if (error.code === 'auth/operation-not-allowed') {
        try {
            await signInAnonymously(auth);
        } catch (anonError) {
            console.error('Error signing in anonymously after Google failed: ', anonError);
        }
    }
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
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, loading };
}
