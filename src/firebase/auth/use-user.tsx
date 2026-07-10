'use client';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, writeBatch, collection } from 'firebase/firestore';
import { NUTRIPLANNER_RECIPES_DATA, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export { type User };

const provider = new GoogleAuthProvider();

/**
 * First-login bootstrap shared by every auth method: creates the profile doc
 * and seeds the initial week plan. No-op when the profile already exists.
 */
async function ensureUserDocuments(firestore: Firestore, user: User, fallbackName?: string) {
  const userRef = doc(firestore, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) return;

  const batch = writeBatch(firestore);

  const profile: UserProfile = {
    name: user.displayName || fallbackName || 'Nuevo Usuario',
    email: user.email || '',
    photoURL: user.photoURL || '',
    stickyNote: '¡Bienvenido a Nutrilp! Usa esta nota para apuntar lo que quieras.',
  };
  batch.set(userRef, profile, { merge: true });

  const recipesCollectionRef = collection(firestore, 'users', user.uid, 'recipes');
  NUTRIPLANNER_RECIPES_DATA.forEach(recipe => {
    const newRecipeRef = doc(recipesCollectionRef, recipe.id);
    batch.set(newRecipeRef, recipe);
  });

  const weekPlanCollectionRef = collection(firestore, 'users', user.uid, 'weekPlan');
  INITIAL_WEEK_PLAN.forEach(dayPlan => {
    const dayRef = doc(weekPlanCollectionRef, dayPlan.day);
    batch.set(dayRef, dayPlan);
  });

  await batch.commit().catch(err => {
    console.error('Error creating initial user data:', err);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: `/users/${user.uid}`,
      operation: 'write',
      requestResourceData: { note: 'Initial user setup batch write.' },
    }));
  });
}

export const signInWithGoogle = async (auth: Auth, firestore: Firestore) => {
  if (!auth || !firestore) {
    console.error("Firebase auth or firestore not available for sign in");
    return;
  };

  try {
    const result = await signInWithPopup(auth, provider);
    if (result && result.user) {
      await ensureUserDocuments(firestore, result.user);
    }
  } catch (error: any) {
     if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Error with sign in popup: ', error);
     }
  }
};

/** Maps Firebase Auth error codes to friendly Spanish messages. */
function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este correo. Inicia sesión (o usa «He olvidado mi contraseña»).';
    case 'auth/weak-password':
      return 'La contraseña es demasiado corta: usa al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El acceso con correo no está habilitado todavía. Contacta con el administrador.';
    default:
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
}

export type EmailAuthResult = { ok: true } | { ok: false; error: string };

/** Creates an account with email + password and bootstraps the user's data. */
export const signUpWithEmail = async (
  auth: Auth,
  firestore: Firestore,
  { name, email, password }: { name: string; email: string; password: string }
): Promise<EmailAuthResult> => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // Set the display name so headers/avatars show something human.
    try {
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch (e) {
      console.warn('No se pudo guardar el nombre en el perfil de auth:', e);
    }
    await ensureUserDocuments(firestore, cred.user, name.trim());
    return { ok: true };
  } catch (error: any) {
    console.error('Email sign-up failed:', error?.code ?? error);
    return { ok: false, error: authErrorMessage(error?.code) };
  }
};

/** Signs in with email + password (bootstraps data for legacy/edge cases). */
export const signInWithEmail = async (
  auth: Auth,
  firestore: Firestore,
  { email, password }: { email: string; password: string }
): Promise<EmailAuthResult> => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserDocuments(firestore, cred.user);
    return { ok: true };
  } catch (error: any) {
    console.error('Email sign-in failed:', error?.code ?? error);
    return { ok: false, error: authErrorMessage(error?.code) };
  }
};

/** Sends the password-reset email. */
export const resetPassword = async (auth: Auth, email: string): Promise<EmailAuthResult> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { ok: true };
  } catch (error: any) {
    console.error('Password reset failed:', error?.code ?? error);
    return { ok: false, error: authErrorMessage(error?.code) };
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
