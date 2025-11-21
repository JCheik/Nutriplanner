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
import type { UserProfile, BaseIngredient, Recipe } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { normalizeText } from '@/lib/utils';


export { type User };

const provider = new GoogleAuthProvider();


export async function migrateInitialIngredients(firestore: Firestore, userId: string): Promise<number> {
    const ingredientsCollectionRef = collection(firestore, 'ingredients');
    
    const uniqueIngredients = new Map<string, Omit<BaseIngredient, 'id'>>();

    INITIAL_RECIPES.forEach(recipe => {
        (recipe.ingredients || []).forEach(ing => {
            const key = normalizeText(ing.name);
            const quantity = ing.quantity ?? 0;

            if (quantity <= 0) return;

            const scale = 100 / quantity;
            
            const newIngredientData: Omit<BaseIngredient, 'id'> = {
                name: ing.name,
                calories: (ing.calories ?? 0) * scale,
                protein: (ing.protein ?? 0) * scale,
                carbs: (ing.carbs ?? 0) * scale,
                fat: (ing.fat ?? 0) * scale,
                fiber: 0,
                createdBy: userId
            };
            
            if (Object.values(newIngredientData).some(val => typeof val === 'number' && isNaN(val))) {
                console.warn(`Skipping ingredient with NaN values: ${newIngredientData.name}`);
                return;
            }

            const existing = uniqueIngredients.get(key);
            const newHasMacros = newIngredientData.calories > 0 || newIngredientData.protein > 0;

            if (!existing || (!existing.calories && newHasMacros)) {
                uniqueIngredients.set(key, newIngredientData);
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
    const existingIngredientNames = new Set(existingIngredientsSnapshot.docs.map(doc => normalizeText(doc.data().name)));

    uniqueIngredients.forEach((ingredientData, key) => {
        if (!existingIngredientNames.has(key)) {
            const docRef = doc(ingredientsCollectionRef); // Firestore generates ID
            batch.set(docRef, ingredientData);
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

export async function populateAndCleanGlobalRecipes(firestore: Firestore): Promise<number> {
  const recipesCollectionRef = collection(firestore, 'nutriplanner_recipes');
  const batch = writeBatch(firestore);

  INITIAL_RECIPES.forEach((recipe) => {
    // 1. Create the clean version of the recipe's ingredients
    const cleanedIngredients = recipe.ingredients.map(({ name, quantity, unit }) => ({
      id: self.crypto.randomUUID(), // Instance ID for this ingredient
      name,
      quantity,
      unit,
    }));

    // 2. Create the full, clean recipe object
    const cleanedRecipe: Recipe = {
      ...recipe,
      ingredients: cleanedIngredients,
    };

    // 3. Generate a predictable, URL-friendly ID from the recipe name
    const docId = normalizeText(recipe.name).replace(/\s+/g, '-').toLowerCase();
    const docRef = doc(recipesCollectionRef, docId);

    // 4. Use set() with merge: true. This will create the document if it doesn't exist,
    // or completely overwrite it if it does. This is how we clean and prevent duplicates.
    batch.set(docRef, cleanedRecipe, { merge: true });
  });

  try {
    await batch.commit();
    console.log(`${INITIAL_RECIPES.length} recetas globales han sido pobladas y limpiadas.`);
    return INITIAL_RECIPES.length;
  } catch (error) {
    console.error("Error populating and cleaning global recipes:", error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'nutriplanner_recipes',
        operation: 'write',
        requestResourceData: { note: `Batch write for ${INITIAL_RECIPES.length} recipes.` }
    }));
    throw new Error("Failed to populate global recipes due to a permissions issue.");
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
