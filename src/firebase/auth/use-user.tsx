'use client';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, writeBatch, collection, getDocs, query, setDoc } from 'firebase/firestore';
import { useAuth } from '@/firebase/provider';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { UserProfile, Recipe } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export { type User };

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (auth: Auth, firestore: Firestore) => {
  if (!auth || !firestore) {
    console.error("Firebase auth or firestore not available for sign in");
    return;
  };

  try {
    const result = await signInWithPopup(auth, provider);
    if (result && result.user) {
      const user = result.user;
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const batch = writeBatch(firestore);
        
        const profile: UserProfile = {
          name: user.displayName || 'Nuevo Usuario',
          email: user.email || '',
          photoURL: user.photoURL || '',
          stickyNote: '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.',
        }
        batch.set(userRef, profile, { merge: true });

        const recipesCollectionRef = collection(firestore, 'users', user.uid, 'recipes');
        INITIAL_RECIPES.forEach(recipe => {
            const newRecipeRef = doc(recipesCollectionRef, recipe.id);
            batch.set(newRecipeRef, recipe);
        });

        const weekPlanCollectionRef = collection(firestore, 'users', user.uid, 'weekPlan');
        INITIAL_WEEK_PLAN.forEach(dayPlan => {
          const dayRef = doc(weekPlanCollectionRef, dayPlan.day);
          batch.set(dayRef, dayPlan);
        });

        await batch.commit().catch(err => {
          console.error("Error creating initial user data:", err);
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `/users/${user.uid}`,
              operation: 'write',
              requestResourceData: { note: 'Initial user setup batch write.' }
          }));
        });
      }
    }
  } catch (error: any) {
     if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Error with sign in popup: ', error);
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

export { useUser } from '@/firebase/provider';
