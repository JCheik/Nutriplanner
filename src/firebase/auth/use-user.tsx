'use client';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/firebase/provider';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { UserProfile, BaseIngredient } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export { type User };

const provider = new GoogleAuthProvider();


export async function migrateInitialIngredients(firestore: Firestore, userId: string): Promise<number> {
    const ingredientsCollectionRef = collection(firestore, 'ingredients');
    
    const uniqueIngredients = new Map<string, Omit<BaseIngredient, 'id'>>();
    INITIAL_RECIPES.forEach(recipe => {
        (recipe.ingredients || []).forEach(ing => {
            const key = ing.name.toLowerCase();
            if (!uniqueIngredients.has(key)) {
                const { id, quantity, unit, ...baseIngredientData } = ing;
                uniqueIngredients.set(key, {
                    ...baseIngredientData,
                    fiber: 0, 
                    createdBy: userId // Use the provided user ID
                });
            }
        });
    });

    if (uniqueIngredients.size === 0) {
        return 0;
    }
    
    const ingredientNames = Array.from(uniqueIngredients.keys()).map(name => {
        const correspondingIngredient = uniqueIngredients.get(name);
        return correspondingIngredient ? correspondingIngredient.name : '';
    }).filter(Boolean);

    let existingIngredientsSnap;

    try {
        if (ingredientNames.length > 0) {
            const existingIngredientsQuery = query(ingredientsCollectionRef, where('name', 'in', ingredientNames));
            existingIngredientsSnap = await getDocs(existingIngredientsQuery);
        } else {
            existingIngredientsSnap = { docs: [] };
        }
    } catch (error) {
        console.error("Error fetching existing ingredients:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'ingredients',
            operation: 'list',
        }));
        throw new Error("Failed to check for existing ingredients due to a permissions issue.");
    }
    
    const existingNames = new Set(existingIngredientsSnap.docs.map(d => d.data().name.toLowerCase()));

    const ingredientsBatch = writeBatch(firestore);
    let newIngredientsCount = 0;
    
    uniqueIngredients.forEach((ingredient, key) => {
        if (!existingNames.has(key)) {
            const newIngredientRef = doc(ingredientsCollectionRef);
            ingredientsBatch.set(newIngredientRef, { ...ingredient, id: newIngredientRef.id, name: ingredient.name, createdBy: userId });
            newIngredientsCount++;
        }
    });

    if (newIngredientsCount > 0) {
        try {
            await ingredientsBatch.commit();
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
