'use server';

import { initializeFirebase } from '@/firebase/server-init';
import { verifyAuth } from '@/lib/verify-auth';

// Generous daily cap on AI actions per user. Normal use is a handful per day;
// this exists to stop runaway loops / abuse from inflating the bill. The hard
// backstop is the Cloud billing budget cap configured in Google Cloud.
const DAILY_AI_LIMIT = 40;

const LIMIT_MESSAGE =
  'Has alcanzado el límite de peticiones de IA por hoy. Puedes seguir planificando a mano y volver mañana. (Límite temporal del alfa.)';

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

  try {
    const { firestore } = initializeFirebase();
    const ref = firestore.doc(`users/${uid}/aiUsage/${todayKey()}`);

    return await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = (snap.exists ? (snap.data()?.count as number) : 0) || 0;
      if (count >= DAILY_AI_LIMIT) {
        return { allowed: false, remaining: 0, message: LIMIT_MESSAGE };
      }
      tx.set(ref, { count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });
      return { allowed: true, remaining: DAILY_AI_LIMIT - (count + 1) };
    });
  } catch (e) {
    console.warn('[ai-rate-limit] quota check failed, allowing call:', e);
    return { allowed: true }; // fail open
  }
}
