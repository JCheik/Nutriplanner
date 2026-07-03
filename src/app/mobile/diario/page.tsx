'use client';

import { Suspense } from 'react';
import { DiaryPageContent } from '@/components/nutri-planner/diary-page-content';
import { MobileLoader } from '@/components/layout/mobile-loader';

export default function MobileDiaryPage() {
  return (
    <Suspense fallback={<MobileLoader label="Cargando tu diario…" />}>
      <DiaryPageContent />
    </Suspense>
  );
}
