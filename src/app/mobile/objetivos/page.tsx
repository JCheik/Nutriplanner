'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLoader } from '@/components/layout/mobile-loader';

/**
 * Goals now live inside the Perfil screen. This route only exists so old
 * links/bookmarks keep working.
 */
function RedirectToPerfil() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/mobile/perfil?tab=objetivos');
  }, [router]);
  return <MobileLoader label="Abriendo tus objetivos…" />;
}

export default function MobileGoalsPage() {
  return (
    <Suspense fallback={<MobileLoader />}>
      <RedirectToPerfil />
    </Suspense>
  );
}
