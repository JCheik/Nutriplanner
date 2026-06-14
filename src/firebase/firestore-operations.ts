import { Firestore, doc, runTransaction, writeBatch, setDoc, deleteDoc, collection, getDoc } from 'firebase/firestore';
import type { DayPlan, Recipe, Meal, RecipeInstance } from '@/lib/types';
import { INITIAL_WEEK_PLAN, DAY_ORDER } from '@/lib/data';

/**
 * Deletes a folder and unlinks all recipes associated with it inside an atomic batch.
 */
export async function deleteFolderAndUnlinkRecipes(
  firestore: Firestore,
  userId: string,
  folderId: string,
  isGlobal: boolean,
  linkedRecipeIds: string[]
) {
  const batch = writeBatch(firestore);

  if (isGlobal) {
    const folderRef = doc(firestore, 'nutriplanner_folders', folderId);
    batch.delete(folderRef);

    for (const recipeId of linkedRecipeIds) {
      const recipeRef = doc(firestore, 'nutriplanner_recipes', recipeId);
      batch.update(recipeRef, { folderId: null });
    }
  } else {
    const folderRef = doc(firestore, 'users', userId, 'folders', folderId);
    batch.delete(folderRef);

    for (const recipeId of linkedRecipeIds) {
      const recipeRef = doc(firestore, 'users', userId, 'recipes', recipeId);
      batch.update(recipeRef, { folderId: null });
    }
  }

  await batch.commit();
}

/**
 * Copies a recipe to a user's collection, ensuring the ID in the data matches the Firestore ID.
 */
export async function copyRecipeToUser(
  firestore: Firestore,
  userId: string,
  recipeData: Omit<Recipe, 'id' | 'folderId'>
) {
  const newDocRef = doc(collection(firestore, 'users', userId, 'recipes'));
  const id = newDocRef.id;
  
  await setDoc(newDocRef, { 
    ...recipeData, 
    id, 
    folderId: null 
  });
  
  return id;
}

/**
 * Updates a specific day plan securely using a transaction.
 */
export async function updateDayPlanTransaction(
  firestore: Firestore,
  userId: string,
  day: string,
  modifierFn: (dayPlan: DayPlan) => DayPlan
) {
  const dayDocRef = doc(firestore, 'users', userId, 'weekPlan', day);

  await runTransaction(firestore, async (transaction) => {
    const dayDoc = await transaction.get(dayDocRef);
    let currentDayPlan: DayPlan;

    if (!dayDoc.exists()) {
      const initial = INITIAL_WEEK_PLAN.find((d) => d.day === day);
      if (!initial) throw new Error("Invalid day");
      // Fallback: If it's empty, use the initial data structure.
      currentDayPlan = { ...initial, meals: initial.meals || [] };
    } else {
      currentDayPlan = dayDoc.data() as DayPlan;
    }

    const updatedPlan = modifierFn(currentDayPlan);
    
    // Validate we're not inserting invalid stuff
    if (!updatedPlan.meals) {
        updatedPlan.meals = [];
    }

    transaction.set(dayDocRef, updatedPlan, { merge: true });
  });
}
