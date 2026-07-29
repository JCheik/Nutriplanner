'use server';

import { initializeFirebase } from '@/firebase/server-init';
import { deleteAccountCompletely } from '@/lib/delete-account';
import { verifyAuth, verifyAdmin } from '@/lib/verify-auth';
import type { Recipe } from '@/lib/types';
import { UserRecord } from 'firebase-admin/auth';

interface SaveRecipePayload {
  idToken: string;
  recipeData: Omit<Recipe, 'id'>;
  imageFile: File | null;
  isGlobal: boolean;
  existingId?: string;
}

/** Maps a thrown auth error to a serializable { success, error } result. */
function authErrorResult(error: unknown): { success: false; error: string } {
  const status = (error as { status?: number }).status;
  if (status === 401) return { success: false, error: 'No autorizado. Inicia sesión de nuevo.' };
  if (status === 403) return { success: false, error: 'Acceso denegado: se requieren permisos de administrador.' };
  return { success: false, error: 'Error de autenticación.' };
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
  const { idToken, recipeData, imageFile, isGlobal, existingId } = payload;

  // Authenticate the caller from their ID token. The Admin SDK bypasses
  // Firestore rules, so authorization MUST be enforced here.
  let userId: string;
  try {
    if (isGlobal) {
      // Global recipes live in nutriplanner_recipes — admins only.
      userId = await verifyAdmin(idToken);
    } else {
      userId = await verifyAuth(
        new Request('https://internal', { headers: { authorization: `Bearer ${idToken}` } })
      );
    }
  } catch (error) {
    return authErrorResult(error);
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

export async function listUsers(idToken: string): Promise<{ success: boolean; users?: ClientUserRecord[]; error?: string; }> {
    try {
        await verifyAdmin(idToken);
    } catch (error) {
        return authErrorResult(error);
    }
    try {
        const { auth } = initializeFirebase();
        const userRecords = await auth.listUsers();
        return { success: true, users: userRecords.users.map(mapUserRecord) };
    } catch (error: any) {
        console.error("Server Action 'listUsers' failed:", error);
        return { success: false, error: 'No se pudieron cargar los usuarios.' };
    }
}

export async function setUserAdmin(idToken: string, uid: string, isAdmin: boolean) {
    let callerUid: string;
    try {
        callerUid = await verifyAdmin(idToken);
    } catch (error) {
        return authErrorResult(error);
    }
    // An admin must not be able to revoke their own admin rights and lock
    // themselves (and possibly everyone) out.
    if (callerUid === uid && !isAdmin) {
        return { success: false, error: 'No puedes quitarte a ti mismo los permisos de administrador.' };
    }
    try {
        const { auth } = initializeFirebase();
        await auth.setCustomUserClaims(uid, { admin: isAdmin });
        return { success: true, message: `El usuario ahora ${isAdmin ? 'es' : 'no es'} administrador.` };
    } catch (error: any) {
        console.error("Server Action 'setUserAdmin' failed:", error);
        return { success: false, error: 'No se pudieron actualizar los permisos del usuario.' };
    }
}

export async function deleteUserAccount(idToken: string, uid: string) {
    let callerUid: string;
    try {
        callerUid = await verifyAdmin(idToken);
    } catch (error) {
        return authErrorResult(error);
    }
    if (callerUid === uid) {
        return { success: false, error: 'No puedes eliminar tu propia cuenta desde el panel de administración.' };
    }
    try {
        // Misma implementación que usa el borrado desde la app (lib/delete-account.ts):
        // borra primero los datos y después el usuario de Auth.
        await deleteAccountCompletely(uid);
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

// El borrado de datos vive en `lib/delete-account.ts`, compartido con el
// endpoint `/api/account/delete` que usa la app para que el usuario se borre a
// sí mismo. Una sola implementación: si se añade una subcolección, se toca ahí.
