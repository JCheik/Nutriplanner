'use server';

import { initializeFirebase } from '@/firebase/server-init';
import type { Recipe } from '@/lib/types';
import { doc, collection, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { UserRecord } from 'firebase-admin/auth';

interface SaveRecipePayload {
  recipeData: Omit<Recipe, 'id'>;
  imageFile: File | null;
  isGlobal: boolean;
  userId: string;
  existingId?: string;
}

// Client-side representation of a user record
type ClientUserRecord = {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    disabled: boolean;
    creationTime: string;
    lastSignInTime: string;
    isAdmin: boolean;
};


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
      const imagePath = `recipes/${userId}/${recipeId}.${imageFile.name.split('.').pop()}`;
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
    return { success: false, error: 'An unexpected error occurred on the server.' };
  }
}

export async function listUsers(): Promise<{ success: boolean; users?: ClientUserRecord[]; error?: string; }> {
    try {
        const { auth } = initializeFirebase();
        const userRecords = await auth.listUsers();
        return { success: true, users: userRecords.users.map(mapUserRecord) };
    } catch (error: any) {
        console.error("Server Action 'listUsers' failed:", error);
        return { success: false, error: 'No se pudieron cargar los usuarios.' };
    }
}

export async function setUserAdmin(uid: string, isAdmin: boolean) {
    try {
        const { auth } = initializeFirebase();
        await auth.setCustomUserClaims(uid, { admin: isAdmin });
        return { success: true, message: `El usuario ahora ${isAdmin ? 'es' : 'no es'} administrador.` };
    } catch (error: any) {
        console.error("Server Action 'setUserAdmin' failed:", error);
        return { success: false, error: 'No se pudieron actualizar los permisos del usuario.' };
    }
}

export async function deleteUserAccount(uid: string) {
    try {
        const { auth, firestore } = initializeFirebase();
        
        // This will trigger the 'delete' extension if installed, which should clean up Firestore/Storage.
        // If not, we have to do it manually.
        await auth.deleteUser(uid);
        
        // Manual cleanup as a fallback
        await deleteUserRelatedData(uid);
        
        return { success: true, message: 'Usuario y todos sus datos han sido eliminados.' };
    } catch (error: any) {
        console.error("Server Action 'deleteUserAccount' failed:", error);
        return { success: false, error: 'No se pudo eliminar el usuario.' };
    }
}

// Helper to map Firebase Admin UserRecord to a serializable object for the client
const mapUserRecord = (user: UserRecord): ClientUserRecord => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    disabled: user.disabled,
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime,
    isAdmin: user.customClaims?.admin === true,
});

// Helper for manual data deletion
async function deleteUserRelatedData(uid: string) {
    const { firestore, storage } = initializeFirebase();
    const userDocRef = doc(firestore, 'users', uid);

    // Array of sub-collection names to delete
    const subcollections = ['recipes', 'folders', 'weekPlan', 'meal_plans'];

    for (const sub of subcollections) {
        const subCollectionRef = collection(userDocRef, sub);
        const snapshot = await getDocs(subCollectionRef);
        const batch = writeBatch(firestore);
        snapshot.forEach(async (docSnapshot) => {
            batch.delete(docSnapshot.ref);
            // If recipes have images, delete them from storage
            if (sub === 'recipes' && docSnapshot.data().imageUrl) {
                try {
                    const url = docSnapshot.data().imageUrl;
                    // Create a reference from the HTTPS URL
                    const imageRef = ref(storage, url);
                    await deleteObject(imageRef);
                } catch (storageError: any) {
                    // Ignore "object not found" errors, as the image might not exist
                    if (storageError.code !== 'storage/object-not-found') {
                        console.error(`Failed to delete image for recipe ${docSnapshot.id}:`, storageError);
                    }
                }
            }
        });
        await batch.commit();
    }

    // Finally, delete the main user document
    await deleteDoc(userDocRef);
}
