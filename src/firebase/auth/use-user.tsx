'use client';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  signInAnonymously,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '..';
import { doc, setDoc, getDoc, writeBatch, collection } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { UserClaims } from '@/lib/types';


export { type User };

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (auth: Auth, firestore: ReturnType<typeof useFirestore>) => {
  if (!auth || !firestore) return;
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

interface UseUserResult {
  user: User | null;
  claims: UserClaims | null;
  loading: boolean;
}

export function useUser(): UseUserResult {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    // Handle redirect result on initial load
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const user = result.user;
          const userRef = doc(firestore, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const batch = writeBatch(firestore);
            
            batch.set(userRef, {
              name: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              stickyNote: '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.',
            }, { merge: true });

            const recipesCollectionRef = collection(firestore, 'users', user.uid, 'recipes');
            INITIAL_RECIPES.forEach(recipe => {
              const recipeRef = doc(recipesCollectionRef);
              batch.set(recipeRef, { ...recipe, id: recipeRef.id });
            });

            const weekPlanCollectionRef = collection(firestore, 'users', user.uid, 'weekPlan');
            INITIAL_WEEK_PLAN.forEach(dayPlan => {
              const dayRef = doc(weekPlanCollectionRef, dayPlan.day);
              batch.set(dayRef, dayPlan);
            });

            await batch.commit().catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `/users/${user.uid}`,
                    operation: 'write',
                    requestResourceData: { note: 'Initial user setup batch write.' }
                }));
            });
          }
        }
      })
      .catch(error => {
        if (error.code !== 'auth/user-cancelled') {
             console.error('Error handling redirect result: ', error);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        setUser(user);
        setClaims(idTokenResult.claims as UserClaims);
      } else {
        setUser(null);
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, claims, loading };
}
