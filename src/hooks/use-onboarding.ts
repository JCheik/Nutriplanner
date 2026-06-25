'use client';

import { useCallback, useState } from 'react';
import { useUser, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

const LS_KEY = 'nutriplanner_onboarding';

function readLocal(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeLocal(flags: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(flags));
  } catch {
    /* localStorage unavailable */
  }
}

/**
 * Per-feature onboarding flag. A guide identified by `id` shows the first time
 * (shouldShow=true) until the user dismisses it forever, which is persisted both
 * to the user's profile (Firestore) and localStorage (for an instant, flash-free
 * decision before Firestore loads).
 *
 *  - shouldShow:     whether to render the guide now
 *  - dismiss:        hide for this session only (reappears next load)
 *  - dismissForever: persist so it never shows again
 */
export function useOnboardingFlag(id: string) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const userProfileRef = useMemoFirebase(
    () => (user && firestore) ? doc(firestore, 'users', user.uid) : null,
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // Session-only dismissal (does not persist).
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const persistedSeen = (userProfile?.onboardingFlags?.[id] ?? readLocal()[id]) === true;
  const shouldShow = !persistedSeen && !sessionDismissed;

  const dismiss = useCallback(() => setSessionDismissed(true), []);

  const dismissForever = useCallback(async () => {
    setSessionDismissed(true);
    const local = readLocal();
    local[id] = true;
    writeLocal(local);
    if (userProfileRef) {
      try {
        // setDoc with merge deep-merges nested maps, so this preserves other flags.
        await setDoc(userProfileRef, { onboardingFlags: { [id]: true } }, { merge: true });
      } catch (e) {
        console.error('Error saving onboarding flag', e);
      }
    }
  }, [id, userProfileRef]);

  return { shouldShow, dismiss, dismissForever };
}

/** Clears all onboarding flags so every guide shows again. */
export function useResetOnboarding() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const userProfileRef = useMemoFirebase(
    () => (user && firestore) ? doc(firestore, 'users', user.uid) : null,
    [firestore, user]
  );

  return useCallback(async () => {
    writeLocal({});
    if (userProfileRef) {
      try {
        // updateDoc replaces the whole map field (merge would keep old keys).
        await updateDoc(userProfileRef, { onboardingFlags: {} });
      } catch (e) {
        console.error('Error resetting onboarding flags', e);
      }
    }
  }, [userProfileRef]);
}
