'use server';

import { initializeFirebase } from '@/firebase/server-init';
import type { Recipe } from '@/lib/types';
import { UserRecord } from 'firebase-admin/auth';
import { Storage } from 'firebase-admin/storage';
import { Firestore } from 'firebase-admin/firestore';

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
    const targetCollectionRef = firestore.collection(targetCollectionPath);
    
    const docRef = existingId ? targetCollectionRef.doc(existingId) : targetCollectionRef.doc();
    const recipeId = docRef.id;

    let finalImageUrl = recipeData.imageUrl || '';

    if (imageFile) {
      const extension = imageFile.name.split('.').pop() || 'jpg';
      const imagePath = `recipes/${isGlobal ? 'global' : userId}/${recipeId}.${extension}`;
      
      const bucket = storage.bucket(); 
      const file = bucket.file(imagePath);
      
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await file.save(buffer, {
          metadata: { contentType: imageFile.type }
      });
      await file.makePublic();
      finalImageUrl = file.publicUrl();
    }

    const recipeToSave: Recipe = {
      ...recipeData,
      id: recipeId,
      imageUrl: finalImageUrl,
    };
    
    await docRef.set(recipeToSave, { merge: true });

    return { success: true, recipeName: recipeToSave.name };
  } catch (error: any) {
    console.error("Server Action 'saveRecipe' failed:", error);

    // Surface a clearer, actionable message instead of a generic one. The most
    // common local-dev failure is that the Admin SDK has no credentials, which
    // is required to upload images to Storage.
    const raw = String(error?.message || error || '');
    const looksLikeCredsIssue =
      /credential|service account|ADC|application default|could not load|unauthenticated|permission/i.test(raw);

    const message = looksLikeCredsIssue
      ? 'No se pudo subir la imagen: faltan las credenciales de Firebase Admin en el servidor. Guarda la receta sin imagen o configura FIREBASE_SERVICE_ACCOUNT_JSON.'
      : `No se pudo guardar la receta en el servidor: ${raw || 'error desconocido'}`;

    return { success: false, error: message };
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
        const { auth, firestore, storage } = initializeFirebase();
        
        // This will trigger the 'delete' extension if installed, which should clean up Firestore/Storage.
        // If not, we have to do it manually.
        await auth.deleteUser(uid);
        
        // Manual cleanup as a fallback
        await deleteUserRelatedData(uid, firestore, storage);
        
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
async function deleteUserRelatedData(uid: string, firestore: Firestore, storage: Storage) {
    const userDocRef = firestore.collection('users').doc(uid);

    // Array of sub-collection names to delete
    const subcollections = ['recipes', 'folders', 'weekPlan', 'meal_plans'];

    for (const sub of subcollections) {
        const subCollectionRef = userDocRef.collection(sub);
        const snapshot = await subCollectionRef.get();
        const batch = firestore.batch();
        snapshot.forEach(async (docSnapshot) => {
            batch.delete(docSnapshot.ref);
            // If recipes have images, delete them from storage
            if (sub === 'recipes' && docSnapshot.data().imageUrl) {
                try {
                    const url = docSnapshot.data().imageUrl;
                    const bucket = storage.bucket();
                    const urlPrefix = `https://storage.googleapis.com/${bucket.name}/`;
                    if (url.startsWith(urlPrefix)) {
                        const path = decodeURIComponent(url.replace(urlPrefix, ''));
                        await bucket.file(path).delete();
                    }
                } catch (storageError: any) {
                    console.error(`Failed to delete image for recipe ${docSnapshot.id}:`, storageError);
                }
            }
        });
        await batch.commit();
    }

    // Finally, delete the main user document
    await userDocRef.delete();
}
