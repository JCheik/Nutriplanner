import { Firestore, doc, runTransaction, setDoc, deleteDoc, collection, getDoc } from 'firebase/firestore';
import type { DayPlan, Recipe, Meal, RecipeInstance, WeekHistoryEntry } from '@/lib/types';
import { INITIAL_WEEK_PLAN, DAY_ORDER } from '@/lib/data';

/** Removes keys whose value is `undefined`, which the Firestore client SDK rejects. */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

/**
 * Saves (creates or updates) a recipe directly from the client SDK.
 *
 * This works in local development and respects Firestore security rules, so it
 * does NOT depend on the Admin SDK / a service account being configured. Image
 * uploads still require the server action (Admin SDK + Storage); this path is
 * used whenever there is no new image file to upload.
 *
 * Uses `{ merge: true }` so editing a recipe without re-sending `imageUrl`
 * preserves the existing image instead of wiping it.
 */
export async function saveRecipeClient(
  firestore: Firestore,
  userId: string,
  recipeData: Omit<Recipe, 'id'>,
  isGlobal: boolean,
  existingId?: string
): Promise<string> {
  const collectionRef = isGlobal
    ? collection(firestore, 'nutriplanner_recipes')
    : collection(firestore, 'users', userId, 'recipes');

  const docRef = existingId ? doc(collectionRef, existingId) : doc(collectionRef);

  const recipeToSave = stripUndefined({
    ...recipeData,
    id: docRef.id,
  });

  await setDoc(docRef, recipeToSave, { merge: true });

  return recipeData.name;
}

/**
 * Deletes a recipe from the correct collection depending on whether it's a
 * global (NutriPlanner) recipe or a personal one. The previous implementation
 * always targeted the user's collection, so deleting a global recipe silently
 * did nothing.
 */
export async function deleteRecipeById(
  firestore: Firestore,
  userId: string,
  recipeId: string,
  isGlobal: boolean
): Promise<void> {
  const recipeRef = isGlobal
    ? doc(firestore, 'nutriplanner_recipes', recipeId)
    : doc(firestore, 'users', userId, 'recipes', recipeId);

  await deleteDoc(recipeRef);
}

/**
 * Copies a recipe to a user's collection, ensuring the ID in the data matches the Firestore ID.
 */
export async function copyRecipeToUser(
  firestore: Firestore,
  userId: string,
  recipeData: Omit<Recipe, 'id'>
) {
  const newDocRef = doc(collection(firestore, 'users', userId, 'recipes'));
  const id = newDocRef.id;

  await setDoc(newDocRef, {
    ...recipeData,
    id,
  });

  return id;
}

/**
 * Saves a snapshot of the current week into the user's history collection.
 * The snapshot is a deep copy of the 7 day plans so later edits to the live
 * plan don't mutate the archived version.
 */
export async function saveWeekSnapshot(
  firestore: Firestore,
  userId: string,
  label: string,
  days: DayPlan[]
): Promise<string> {
  const docRef = doc(collection(firestore, 'users', userId, 'weekHistory'));
  const entry: WeekHistoryEntry = {
    id: docRef.id,
    savedAt: Date.now(),
    label,
    // Deep clone so the snapshot is independent of the live plan.
    days: JSON.parse(JSON.stringify(days)),
  };
  await setDoc(docRef, entry);
  return docRef.id;
}

/** Deletes a saved week snapshot from the user's history. */
export async function deleteWeekSnapshot(
  firestore: Firestore,
  userId: string,
  snapshotId: string
): Promise<void> {
  await deleteDoc(doc(firestore, 'users', userId, 'weekHistory', snapshotId));
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
