'use client';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, writeBatch, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { useAuth } from '@/firebase/provider';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { UserProfile, BaseIngredient, Ingredient } from '@/lib/types';
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
        
        // --- START INGREDIENT MIGRATION ---
        try {
            const ingredientsCollectionRef = collection(firestore, 'ingredients');
            
            // 1. Get all unique ingredients from INITIAL_RECIPES
            const uniqueIngredients = new Map<string, Omit<BaseIngredient, 'id'>>();
            INITIAL_RECIPES.forEach(recipe => {
                recipe.ingredients.forEach(ing => {
                    const key = ing.name.toLowerCase();
                    if (!uniqueIngredients.has(key)) {
                        const { id, quantity, unit, ...baseIngredientData } = ing;
                        uniqueIngredients.set(key, {
                            ...baseIngredientData,
                            fiber: 0, // Assume 0 fiber if not present
                            createdBy: 'system' // Mark as system-generated
                        });
                    }
                });
            });

            const ingredientNames = Array.from(uniqueIngredients.keys());

            // 2. Check which ingredients already exist in Firestore
            const existingIngredientsQuery = query(ingredientsCollectionRef, where('name', 'in', ingredientNames.map(name => name.charAt(0).toUpperCase() + name.slice(1))));
            const existingIngredientsSnap = await getDocs(existingIngredientsQuery);
            const existingNames = new Set(existingIngredientsSnap.docs.map(d => d.data().name.toLowerCase()));

            // 3. Add only the ingredients that do not exist
            const ingredientsBatch = writeBatch(firestore);
            uniqueIngredients.forEach((ingredient, key) => {
                if (!existingNames.has(key)) {
                    const newIngredientRef = doc(ingredientsCollectionRef);
                    ingredientsBatch.set(newIngredientRef, { ...ingredient, id: newIngredientRef.id, name: ingredient.name });
                }
            });

            await ingredientsBatch.commit();

        } catch (error) {
            console.error("Error seeding global ingredients:", error);
            // Non-critical error, so we don't need to throw, just log it.
        }
        // --- END INGREDIENT MIGRATION ---
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
