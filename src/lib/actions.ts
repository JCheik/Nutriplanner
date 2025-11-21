'use server';

import { initializeFirebase } from '@/firebase/server-init';
import type { Recipe } from '@/lib/types';
import { doc, collection, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SaveRecipePayload {
  recipeData: Omit<Recipe, 'id'>;
  imageFile: File | null;
  isGlobal: boolean;
  userId: string;
  existingId?: string;
}

/**
 * Server Action to save a recipe to Firestore and upload an image to Storage.
 * This encapsulates server-side logic for creating or updating recipes.
 */
export async function saveRecipe(payload: SaveRecipePayload) {
  const { recipeData, imageFile, isGlobal, userId, existingId } = payload;
  
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { firestore, storage } = initializeFirebase();

  try {
    const targetCollectionPath = isGlobal ? 'nutriplanner_recipes' : `users/${userId}/recipes`;
    const targetCollectionRef = collection(firestore, targetCollectionPath);
    
    const recipeId = existingId || doc(targetCollectionRef).id;
    let finalImageUrl = recipeData.imageUrl || '';

    if (imageFile) {
      const imagePath = `recipes/${recipeId}.${imageFile.name.split('.').pop()}`;
      const imageStorageRef = ref(storage, imagePath);
      const snapshot = await uploadBytes(imageStorageRef, imageFile);
      finalImageUrl = await getDownloadURL(snapshot.ref);
    }

    const recipeToSave: Recipe = {
      ...recipeData,
      id: recipeId,
      imageUrl: finalImageUrl,
    };
    
    const recipeRef = doc(targetCollectionRef, recipeId);
    await setDoc(recipeRef, recipeToSave, { merge: true });

    return { success: true, recipeName: recipeToSave.name };
  } catch (error: any) {
    console.error("Server Action 'saveRecipe' failed:", error);
    // Return a generic error message to the client for security
    return { success: false, error: 'An unexpected error occurred on the server.' };
  }
}

    