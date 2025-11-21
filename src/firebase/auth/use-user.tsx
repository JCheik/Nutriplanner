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
import type { UserProfile, BaseIngredient, Recipe } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export { type User };

const provider = new GoogleAuthProvider();


export async function migrateInitialIngredients(firestore: Firestore, userId: string): Promise<number> {
    const ingredientsCollectionRef = collection(firestore, 'ingredients');
    
    // Step 1: Collect all unique ingredients from INITIAL_RECIPES, prioritizing those with macro data.
    const uniqueIngredients = new Map<string, Omit<BaseIngredient, 'id'>>();
    INITIAL_RECIPES.forEach(recipe => {
        (recipe.ingredients || []).forEach(ing => {
            const key = ing.name.toLowerCase();
            const quantity = ing.quantity ?? 0;
            const hasMacros = (ing.calories ?? 0) > 0 || (ing.protein ?? 0) > 0;
            
            // Only process ingredients with a valid quantity to avoid division by zero
            if (quantity <= 0) return;

            const scale = 100 / quantity;
            const newIngredientData: Omit<BaseIngredient, 'id'> = {
                name: ing.name,
                calories: (ing.calories ?? 0) * scale,
                protein: (ing.protein ?? 0) * scale,
                carbs: (ing.carbs ?? 0) * scale,
                fat: (ing.fat ?? 0) * scale,
                fiber: 0, // Fiber data is not available in initial recipes
                createdBy: userId
            };

            // Avoid adding ingredients with NaN values
            if (Object.values(newIngredientData).some(val => typeof val === 'number' && isNaN(val))) {
                console.warn(`Skipping ingredient with NaN values: ${newIngredientData.name}`);
                return;
            }
            
            const existing = uniqueIngredients.get(key);
            const existingHasMacros = (existing?.calories ?? 0) > 0 || (existing?.protein ?? 0) > 0;

            // Add if it's the first time, or if the new one has macros and the existing one doesn't.
            if (!existing || (hasMacros && !existingHasMacros)) {
                uniqueIngredients.set(key, newIngredientData);
            }
        });
    });

    if (uniqueIngredients.size === 0) {
        return 0;
    }
    
    // Step 2: Check which of these ingredients already exist in Firestore.
    const batch = writeBatch(firestore);
    let newIngredientsCount = 0;
    
    const existingIngredientsQuery = query(collection(firestore, "ingredients"));
    const existingIngredientsSnapshot = await getDocs(existingIngredientsQuery);
    const existingIngredientNames = new Set(existingIngredientsSnapshot.docs.map(doc => doc.data().name.toLowerCase()));

    // Step 3: Add only the ingredients that are not already in the database.
    uniqueIngredients.forEach((ingredientData, key) => {
        if (!existingIngredientNames.has(key)) {
            const docRef = doc(ingredientsCollectionRef); // Let Firestore generate the ID
            batch.set(docRef, { ...ingredientData, id: docRef.id });
            newIngredientsCount++;
        }
    });

    // Step 4: Commit the batch if there are new ingredients to add.
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

export async function cleanNutriPlannerRecipes(firestore: Firestore): Promise<number> {
  const recipesCollectionRef = collection(firestore, 'nutriplanner_recipes');
  const snapshot = await getDocs(recipesCollectionRef);

  if (snapshot.empty) {
    console.log("No NutriPlanner recipes found to clean.");
    return 0;
  }

  const batch = writeBatch(firestore);
  let cleanedCount = 0;

  snapshot.forEach(document => {
    const recipe = document.data() as Recipe;
    
    // Only clean if there are ingredients and at least one has extra fields
    const needsCleaning = recipe.ingredients && recipe.ingredients.some(ing => 'calories' in ing || 'protein' in ing);

    if (needsCleaning) {
      const cleanedIngredients = recipe.ingredients.map(({ id, name, quantity, unit }) => ({
        id,
        name,
        quantity,
        unit,
      }));

      const docRef = doc(firestore, 'nutriplanner_recipes', document.id);
      batch.update(docRef, { ingredients: cleanedIngredients });
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    await batch.commit();
  }

  return cleanedCount;
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
          // We still copy the 'dirty' recipe, which is fine. The app logic will handle it.
          // The global collection is what we clean.
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
