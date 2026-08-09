'use server';

import { initializeFirebase } from '@/firebase/server-init';
import { verifyAuth } from '@/lib/verify-auth';

// Generous daily cap on AI actions per user. Normal use is a handful per day;
// this exists to stop runaway loops / abuse from inflating the bill.
const DAILY_AI_LIMIT = 40;

/**
 * Tope GLOBAL diario, sumando TODOS los usuarios.
 *
 * El de arriba es por usuario, así que el gasto máximo crecía con el número de
 * cuentas: 50 usuarios × 40 = 2.000 peticiones al día sin techo. Y el respaldo
 * que decía este fichero —el límite de gasto de Google Cloud— resultó ser un
 * presupuesto de SOLO ALERTAS: avisa por correo y sigue cobrando. O sea que no
 * había ningún tope real en ninguna parte.
 *
 * Esto NO pretende ajustarse a un presupuesto mensual: es un cortafuegos contra
 * lo anormal (un bucle, una cuenta abusando, un pico inesperado). Para hacerse
 * una idea con los precios de agosto de 2026:
 *   · autocompletar ≈ 0,5 céntimos (gemini-3.1-flash-lite)
 *   · importar receta ≈ 5 céntimos (gemini-3.5-flash, sobre todo si hay vídeo)
 * Con 400, el peor día imaginable —las 400 siendo importaciones— cuesta unos
 * 20 €. Un día normal de alfa no pasará de unas decenas de peticiones.
 *
 * Es UN documento que se escribe en cada petición de IA. Firestore aguanta ~1
 * escritura por segundo sostenida en un mismo documento, así que esto vale de
 * sobra para el alfa; si algún día hay tráfico de verdad, habría que repartirlo
 * en varios contadores y sumarlos.
 */
const GLOBAL_DAILY_AI_LIMIT = 400;

const GLOBAL_LIMIT_MESSAGE =
  'Hoy se ha alcanzado el límite de IA de toda la app. Puedes seguir planificando a mano; mañana vuelve a estar disponible.';

const LIMIT_MESSAGE =
  'Has alcanzado el límite de peticiones de IA por hoy. Puedes seguir planificando a mano y volver mañana. (Límite temporal del alfa.)';

/**
 * Tope de lecturas de páginas externas. Bastante más alto que el de IA porque
 * el importador de la web pide la página ANTES de llamar a la IA, y a veces se
 * mira un enlace que luego no se guarda: con el mismo contador, cada vistazo
 * gastaría cuota de IA.
 */
const DAILY_FETCH_LIMIT = 120;

const FETCH_LIMIT_MESSAGE =
  'Has leído muchos enlaces hoy. Prueba de nuevo mañana. (Límite temporal del alfa.)';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export interface AiQuotaResult {
  allowed: boolean;
  remaining?: number;
  message?: string;
}

/**
 * Per-user daily quota for AI actions. Increments the user's counter and returns
 * whether the call is allowed. Enforced server-side via the Admin SDK so the
 * count can't be tampered with from the client (the counter lives under
 * users/{uid}/aiUsage, which Firestore rules don't expose to clients).
 *
 * Fails OPEN: if the token can't be verified or the counter store is unavailable
 * (e.g. the Admin SDK has no credentials in local dev), the call is allowed — the
 * quota is a cost guard for production, not a hard gate that should break the app
 * when infra is missing.
 */
export async function consumeAiQuota(idToken: string | undefined): Promise<AiQuotaResult> {
  if (!idToken) return { allowed: true };

  let uid: string;
  try {
    uid = await verifyAuth(
      new Request('https://internal', { headers: { authorization: `Bearer ${idToken}` } })
    );
  } catch {
    return { allowed: true }; // can't identify the user — don't block
  }

  return consume(uid, 'aiUsage', DAILY_AI_LIMIT, LIMIT_MESSAGE, true);
}

/**
 * Cuota de lecturas de páginas externas para `/api/fetch-social-url`.
 *
 * Ese endpoint pide auth pero no tenía tope, y desde que acepta cualquier
 * dominio (antes solo ocho de redes sociales) es un proxy web autenticado: con
 * el registro abierto, basta crearse una cuenta para hacer que el servidor
 * descargue páginas ajenas y devuelva sus imágenes. Las defensas anti-SSRF
 * impiden llegar a la red interna, así que lo que queda es gasto de ancho de
 * banda — molesto, no grave, pero gratis de tapar.
 *
 * Recibe el uid ya verificado: la ruta llama antes a `verifyAuth`, y volver a
 * validar el token sería una comprobación de más por petición.
 */
export async function consumeSocialFetchQuota(uid: string): Promise<AiQuotaResult> {
  return consume(uid, 'fetchUsage', DAILY_FETCH_LIMIT, FETCH_LIMIT_MESSAGE);
}

/**
 * Contador diario por usuario, en su propia subcolección. Vive bajo
 * `users/{uid}/{bucket}`, que las rules no exponen al cliente, así que no se
 * puede manipular desde el navegador.
 *
 * Falla ABIERTO: si el almacén no está disponible (p. ej. el Admin SDK sin
 * credenciales en local) se deja pasar. La cuota es un guardarraíl de coste
 * para producción, no una puerta que deba romper la app cuando falta infra.
 */
async function consume(
  uid: string,
  bucket: 'aiUsage' | 'fetchUsage',
  limit: number,
  limitMessage: string,
  /** Si además cuenta contra el tope global de la app (solo la IA, no las lecturas). */
  alsoGlobal = false
): Promise<AiQuotaResult> {
  try {
    const { firestore } = initializeFirebase();
    const ref = firestore.doc(`users/${uid}/${bucket}/${todayKey()}`);
    // Contador compartido, fuera de `users/`: las rules no lo exponen a nadie y
    // solo lo toca el Admin SDK.
    const globalRef = firestore.doc(`aiUsageGlobal/${todayKey()}`);

    return await firestore.runTransaction(async (tx) => {
      // Las lecturas van TODAS antes que las escrituras: Firestore lo exige.
      const snap = await tx.get(ref);
      const globalSnap = alsoGlobal ? await tx.get(globalRef) : null;

      const count = (snap.exists ? (snap.data()?.count as number) : 0) || 0;
      if (count >= limit) {
        return { allowed: false, remaining: 0, message: limitMessage };
      }

      const globalCount = (globalSnap?.exists ? (globalSnap.data()?.count as number) : 0) || 0;
      if (alsoGlobal && globalCount >= GLOBAL_DAILY_AI_LIMIT) {
        return { allowed: false, remaining: 0, message: GLOBAL_LIMIT_MESSAGE };
      }

      tx.set(ref, { count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });
      if (alsoGlobal) {
        tx.set(globalRef, { count: globalCount + 1, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return { allowed: true, remaining: limit - (count + 1) };
    });
  } catch (e) {
    console.warn(`[ai-rate-limit] quota check failed for ${bucket}, allowing call:`, e);
    return { allowed: true }; // fail open
  }
}
