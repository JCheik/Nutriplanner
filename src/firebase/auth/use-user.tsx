'use client';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, writeBatch, collection, getDocs, query, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/firebase/provider';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { UserProfile, BaseIngredient, Recipe, Ingredient } from '@/lib/types';
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
            const hasMacros = (ing.calories ?? 0) > 0 || (ing.protein ?? 0) > 0;

            const existing = uniqueIngredients.get(key);
            const existingHasMacros = (existing?.calories ?? 0) > 0 || (existing?.protein ?? 0) > 0;
            
            const quantity = ing.quantity ?? 0;
            const scale = quantity > 0 ? 100 / quantity : 0;
            
            // If the new one has macros and the existing one doesn't, or if it's the first time we see it, add it.
            if (!existing || (hasMacros && !existingHasMacros)) {
                 const normalizedIngredient: Omit<BaseIngredient, 'id'> = {
                    name: ing.name,
                    calories: (ing.calories ?? 0) * scale,
                    protein: (ing.protein ?? 0) * scale,
                    carbs: (ing.carbs ?? 0) * scale,
                    fat: (ing.fat ?? 0) * scale,
                    fiber: 0, // Assuming fiber is not in the initial data
                    createdBy: userId
                };
                uniqueIngredients.set(key, normalizedIngredient);
            }
        });
    });

    if (uniqueIngredients.size === 0) {
        return 0;
    }
    
    const batch = writeBatch(firestore);
    let newIngredientsCount = 0;
    
    const existingIngredientsQuery = query(collection(firestore, "ingredients"));
    const existingIngredientsSnapshot = await getDocs(existingIngredientsQuery);
    const existingIngredientNames = new Set(existingIngredientsSnapshot.docs.map(doc => doc.data().name.toLowerCase()));

    uniqueIngredients.forEach((ingredientData, key) => {
        if (!existingIngredientNames.has(key)) {
            // Avoid creating ingredients with NaN values
            if (isNaN(ingredientData.calories) || isNaN(ingredientData.protein) || isNaN(ingredientData.carbs) || isNaN(ingredientData.fat)) {
                console.warn(`Skipping ingredient with NaN values: ${ingredientData.name}`);
                return;
            }
            const docId = ingredientData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            if (!docId) return;
            const newIngredientRef = doc(ingredientsCollectionRef, docId);
            
            batch.set(newIngredientRef, { ...ingredientData, id: docId });
            newIngredientsCount++;
        }
    });

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

export async function cleanNutriPlannerRecipes(firestore: Firestore) {
  const batch = writeBatch(firestore);
  const recipesCollectionRef = collection(firestore, 'nutriplanner_recipes');
  
  try {
    // 1. Get all documents from the nutriplanner_recipes collection
    const snapshot = await getDocs(recipesCollectionRef);

    // 2. Iterate over each document found in the database
    snapshot.forEach(document => {
      const recipe = document.data() as Recipe;
      
      // 3. Create a "clean" version of the ingredients array
      const cleanIngredients = (recipe.ingredients || []).map(ing => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }));

      // 4. Update the existing document with the cleaned data
      const cleanedRecipeData = {
        ...recipe,
        ingredients: cleanIngredients,
      };
      
      batch.update(document.ref, cleanedRecipeData);
    });

    // 5. Commit the batch update
    await batch.commit();

  } catch (error) {
    console.error("Error cleaning NutriPlanner recipes:", error);
    // Emit a generic error for the collection, as this is a batch operation
    errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: '/nutriplanner_recipes',
        operation: 'write',
        requestResourceData: { note: 'Batch cleaning of all nutriplanner recipes.' }
    }));
    throw error; // Re-throw to be caught by the UI
  }
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
          const cleanRecipe: Omit<Recipe, 'id'> & { id: string } = {
            ...recipe,
            id: recipeRef.id,
            ingredients: (recipe.ingredients || []).map(ing => ({
                id: ing.id,
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
            })),
          };
          batch.set(recipeRef, cleanRecipe);
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
