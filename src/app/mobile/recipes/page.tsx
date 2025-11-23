'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/icons/logo';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando recetas...</p>
        </div>
    </div>
);

const MobileRecipesPageContent = dynamic(
    () => import('@/components/nutri-planner/mobile-recipes-page-content').then(mod => mod.MobileRecipesPageContent),
    { 
        ssr: false,
        loading: () => <MobilePageLoader />
    }
);

export default function MobileRecipesPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileRecipesPageContent />
        </Suspense>
    );
}
