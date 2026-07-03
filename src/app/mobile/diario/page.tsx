'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLoader } from '@/components/layout/mobile-loader';

/**
 * The standalone diary screen was folded into the plan (eaten checks) and the
 * Perfil screen (progress charts + weight). This route only exists so old
 * links/bookmarks keep working.
 */
function RedirectToPerfil() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/mobile/perfil?tab=progreso');
  }, [router]);
  return <MobileLoader label="Abriendo tu progreso…" />;
}

export default function MobileDiaryPage() {
  return (
    <Suspense fallback={<MobileLoader />}>
      <RedirectToPerfil />
    </Suspense>
  );
}
