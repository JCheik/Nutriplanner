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
import { initialIngredients } from '@/lib/initial-ingredients';

export { type User };

const provider = new GoogleAuthProvider();

// One-time migration of initial ingredients to the global collection
const migrateIngredients = async (firestore: ReturnType<typeof useFirestore>) => {
    if (!firestore) return;
    const ingredientsCol = collection(firestore, 'ingredients');
    const q = query(ingredientsCol, limit(1));
    const snapshot = await getDocs(q);

    // If the collection is empty, populate it.
    if (snapshot.empty) {
        console.log("Migrating initial ingredients to Firestore...");
        const batch = writeBatch(firestore);
        initialIngredients.forEach(ingredient => {
            const docRef = doc(ingredientsCol); // auto-generate ID
            // We need to add the id property to the object itself
            const ingredientWithId = { ...ingredient, id: docRef.id };
            batch.set(docRef, ingredientWithId);
        });
        await batch.commit();
        console.log("Initial ingredients migrated successfully.");
    }
}


export const signInWithGoogle = async (auth: Auth, firestore: ReturnType<typeof useFirestore>) => {
  if (!auth || !firestore) return;
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // Run ingredient migration check on successful sign-in
    await migrateIngredients(firestore);

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

      await batch.commit();
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
