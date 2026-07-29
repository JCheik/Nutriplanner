import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { Platform } from 'react-native';

import { signOut } from 'firebase/auth';

import { auth, firestore } from '@/firebase';
import { INITIAL_WEEK_PLAN } from '@/lib/data';
import type { UserProfile } from '@/lib/types';

/** Misma base que los endpoints de IA (ver `ai-client.ts`). */
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://nutrilp.com').replace(/\/$/, '');

/**
 * Alta, entrada y recuperación de contraseña. Replica el contrato de la web
 * (`src/firebase/auth/use-user.tsx`) para que una cuenta creada en la app sea
 * indistinguible de una creada en la web — si divergen, el usuario acabaría con
 * un perfil a medias.
 */

/** Mensajes en español de los códigos de error que la gente se encuentra. */
export function authErrorMessage(code: string | undefined): string {
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
      return 'Ya existe una cuenta con este correo. Inicia sesión, o usa "He olvidado mi contraseña".';
    case 'auth/weak-password':
      return 'La contraseña es demasiado corta: usa al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El acceso con correo no está habilitado todavía.';
    default:
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
}

export type AuthResult = { ok: true } | { ok: false; error: string };

/**
 * Arranque de la primera entrada, igual que en la web: crea el doc de perfil y
 * siembra la semana vacía. No hace nada si el perfil ya existe (una cuenta
 * creada en la web y estrenada aquí no se pisa).
 *
 * La web además sembraría `NUTRIPLANNER_RECIPES_DATA` en las recetas del
 * usuario, pero ese array está VACÍO desde hace tiempo: el recetario de Nutrilp
 * vive en la colección global `nutriplanner_recipes`, que la app ya lee. Por eso
 * aquí no se copia nada de recetas.
 */
async function ensureUserDocuments(user: User, fallbackName?: string) {
  const userRef = doc(firestore, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;

  const batch = writeBatch(firestore);
  const profile: UserProfile = {
    name: user.displayName || fallbackName || 'Nuevo Usuario',
    email: user.email || '',
    photoURL: user.photoURL || '',
    stickyNote: '¡Bienvenido a Nutrilp! Usa esta nota para apuntar lo que quieras.',
  };
  batch.set(userRef, profile, { merge: true });

  const weekPlanRef = collection(firestore, 'users', user.uid, 'weekPlan');
  INITIAL_WEEK_PLAN.forEach((dayPlan) => batch.set(doc(weekPlanRef, dayPlan.day), dayPlan));

  await batch.commit();
}

export async function signUpWithEmail({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // El nombre en el perfil de auth, para que las cabeceras saluden a alguien.
    await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
    await ensureUserDocuments(cred.user, name.trim());
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: authErrorMessage(e?.code) };
  }
}

export async function signInWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    // Cuentas antiguas o creadas fuera del flujo normal: se completa lo que falte.
    await ensureUserDocuments(cred.user).catch(() => {});
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: authErrorMessage(e?.code) };
  }
}

/**
 * ── Google ────────────────────────────────────────────────────────────────
 * Se usa la librería NATIVA (`@react-native-google-signin`), que es lo que
 * recomienda Expo hoy: selector de cuentas del sistema, sin dar el rodeo por el
 * navegador. Devuelve un `idToken` de Google que se cambia por una sesión de
 * Firebase — el MISMO usuario que en la web, porque el proyecto es el mismo.
 *
 * `webClientId` es el cliente OAuth **de tipo Web** del proyecto (el que ya usa
 * la web para su login de Google): es quien firma el `idToken`. El cliente
 * Android no se nombra aquí, pero tiene que existir con el `com.nutrilp.app` y
 * la huella SHA-1 del keystore, o Google devuelve DEVELOPER_ERROR.
 *
 * Sin la variable configurada el botón ni aparece (ver `GOOGLE_ENABLED`), así
 * que una compilación sin ella no enseña un botón roto.
 */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
// En web la librería nativa no está implementada (avisa por consola y su soporte
// web es de pago), así que ahí el botón ni se ofrece: el preview de Expo web se
// usa para revisar diseño, y el login de Google se prueba en el APK.
export const GOOGLE_ENABLED = GOOGLE_WEB_CLIENT_ID.length > 0 && Platform.OS !== 'web';

if (GOOGLE_ENABLED) {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!GOOGLE_ENABLED) {
    return { ok: false, error: 'El acceso con Google no está configurado en esta versión de la app.' };
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      // El usuario cerró el selector de cuentas: no es un error que mostrar.
      return { ok: true };
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      return { ok: false, error: 'Google no devolvió el token de acceso. Inténtalo de nuevo.' };
    }
    const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    await ensureUserDocuments(cred.user);
    return { ok: true };
  } catch (e: any) {
    if (isErrorWithCode(e)) {
      switch (e.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { ok: true };
        case statusCodes.IN_PROGRESS:
          return { ok: false, error: 'Ya hay un inicio de sesión en marcha.' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { ok: false, error: 'Este móvil no tiene los Servicios de Google Play actualizados.' };
      }
    }
    return { ok: false, error: authErrorMessage(e?.code) };
  }
}

/** Cierra también la sesión de Google, si la había, además de la de Firebase. */
export async function signOutGoogle() {
  if (!GOOGLE_ENABLED) return;
  await GoogleSignin.signOut().catch(() => {});
}

/**
 * Borrado de la propia cuenta contra `/api/account/delete` de la web. Va por el
 * servidor (Admin SDK) y no con `deleteUser()` del cliente por dos motivos: el
 * cliente exige haber iniciado sesión hace poco (`auth/requires-recent-login`),
 * y borrar todas las subcolecciones desde el móvil serían decenas de escrituras
 * que pueden quedarse a medias.
 */
export async function deleteOwnAccount(): Promise<AuthResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'No hay sesión iniciada.' };

  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE_URL}/api/account/delete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error ?? 'No se pudo borrar la cuenta. Inténtalo de nuevo.' };
    }
    // La cuenta ya no existe: cerrar sesión local para que el gate vuelva al login.
    await signOutGoogle();
    await signOut(auth);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' };
  }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: authErrorMessage(e?.code) };
  }
}
