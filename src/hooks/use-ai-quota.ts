'use client';

import { useCallback } from 'react';
import { useUser } from '@/firebase';
import { consumeAiQuota, type AiQuotaResult } from '@/lib/ai-rate-limit';

/**
 * Client gate for the per-user daily AI quota. Call `check()` right before
 * invoking any AI flow; if `allowed` is false, show `message` and skip the call.
 * Never blocks on its own errors (returns allowed).
 */
export function useAiQuota() {
  const { user } = useUser();

  const check = useCallback(async (): Promise<AiQuotaResult> => {
    if (!user) return { allowed: true };
    try {
      const idToken = await user.getIdToken();
      return await consumeAiQuota(idToken);
    } catch {
      return { allowed: true };
    }
  }, [user]);

  return { check };
}
