import { doc, setDoc } from 'firebase/firestore';
import { useCallback } from 'react';

import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useProfile } from '@/hooks/use-nutrilp-data';

/**
 * Flag de onboarding por funcionalidad, con el MISMO almacén que la web
 * (`users/{uid}.onboardingFlags`), así "Ver guías de nuevo" de la web también
 * reactiva las de la app y no se duplica el estado por dispositivo.
 */
export function useOnboardingFlag(id: string) {
  const { user } = useAuthUser();
  const { profile, loading } = useProfile();

  const seen = profile?.onboardingFlags?.[id] === true;

  const dismissForever = useCallback(async () => {
    if (!user) return;
    // setDoc con merge fusiona mapas anidados: conserva el resto de flags.
    await setDoc(doc(firestore, 'users', user.uid), { onboardingFlags: { [id]: true } }, { merge: true }).catch(
      () => {}
    );
  }, [user, id]);

  /**
   * Vuelve a marcar la guía como no vista. Se usa para "ver el tour otra vez"
   * desde Perfil: hasta la auditoría, repetir el tour solo se podía desde la
   * web, y el propio tour lo anunciaba — un callejón sin salida en la app.
   */
  const showAgain = useCallback(async () => {
    if (!user) return;
    await setDoc(doc(firestore, 'users', user.uid), { onboardingFlags: { [id]: false } }, { merge: true }).catch(
      () => {}
    );
  }, [user, id]);

  // Mientras carga el perfil no se muestra nada, para que no parpadee.
  return { shouldShow: !loading && !!user && !seen, dismissForever, showAgain };
}
