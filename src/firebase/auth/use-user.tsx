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
import type { UserProfile, BaseIngredient } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export { type User };

const provider = new GoogleAuthProvider();


export async function migrateInitialIngredients(firestore: Firestore, userId: string): Promise<number> {
    const ingredientsCollectionRef = collection(firestore, 'ingredients');
    
    // 1. Collect all unique ingredients from initial recipes and normalize macros to 100g.
    const uniqueIngredients = new Map<string, Omit<BaseIngredient, 'id'>>();

    INITIAL_RECIPES.forEach(recipe => {
        (recipe.ingredients || []).forEach(ing => {
            const key = ing.name.toLowerCase();
            
            // Normalize macros to a 100g standard.
            // Formula: (value / quantity) * 100
            const scale = ing.quantity > 0 ? 100 / ing.quantity : 0;
            const normalizedIngredient: Omit<BaseIngredient, 'id'> = {
                name: ing.name,
                calories: (ing.calories || 0) * scale,
                protein: (ing.protein || 0) * scale,
                carbs: (ing.carbs || 0) * scale,
                fat: (ing.fat || 0) * scale,
                fiber: 0, // Assuming fiber is not in the initial data
                createdBy: userId
            };
            
            uniqueIngredients.set(key, normalizedIngredient);
        });
    });

    if (uniqueIngredients.size === 0) {
        return 0;
    }
    
    // 2. Use a write batch to set/overwrite these normalized ingredients in the database.
    // This ensures the database always has the correct 100g-standardized values.
    const batch = writeBatch(firestore);
    let newIngredientsCount = 0;
    
    // We create a new ingredient document for each unique name.
    // The document ID will be a sanitized version of the ingredient name.
    uniqueIngredients.forEach((ingredientData) => {
        // Create a Firestore-safe ID from the ingredient name
        const docId = ingredientData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newIngredientRef = doc(ingredientsCollectionRef, docId);
        
        batch.set(newIngredientRef, { ...ingredientData, id: docId });
        newIngredientsCount++;
    });

    // 3. Commit the batch.
    if (newIngredientsCount > 0) {
        try {
            await batch.commit();
        } catch (error) {
             console.error("Error committing ingredients batch:", error);
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'ingredients',
                operation: 'create',
                requestResourceData: { note: `${newIngredientsCount} new ingredients.` }
            }));
            throw new Error("Failed to save new ingredients due to a permissions issue.");
        }
    }
    
    return newIngredientsCount;
}


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
          const recipeRef = doc(recipesCollectionRef);
          batch.set(recipeRef, { ...recipe, id: recipeRef.id });
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
