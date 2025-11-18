'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads an image file to Firebase Storage and returns its public URL.
 *
 * @param file The image file to upload.
 * @param recipeId The ID of the recipe, used to create a unique path.
 * @returns A promise that resolves with the public URL of the uploaded image.
 */
export async function uploadImageAndGetUrl(file: File, recipeId: string): Promise<string> {
  const storage = getStorage();
  
  // Create a unique path for the image based on the recipe ID.
  // Example: recipes/123xyz.jpg
  const fileExtension = file.name.split('.').pop();
  const imagePath = `recipes/${recipeId}.${fileExtension}`;
  const storageRef = ref(storage, imagePath);

  try {
    // Upload the file to the specified path.
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the public URL of the uploaded file.
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    // Re-throw the error to be handled by the caller.
    throw new Error("Failed to upload image.");
  }
}
