'use client';

import { Suspense } from 'react';
import { PerfilPageContent } from '@/components/nutri-planner/perfil-page-content';
import { MobileLoader } from '@/components/layout/mobile-loader';

export default function MobilePerfilPage() {
  return (
    <Suspense fallback={<MobileLoader label="Cargando tu perfil…" />}>
      <PerfilPageContent />
    </Suspense>
  );
}
