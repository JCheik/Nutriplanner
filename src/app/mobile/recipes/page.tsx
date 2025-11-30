'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { Logo } from '@/components/icons/logo';


const MobilePageLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando recetas...</p>
        </div>
    </div>
);

function MobileRecipesWrapper() {
    const searchParams = useSearchParams();
    const isGuestMode = searchParams.get('guest') === 'true';

    const recipeState = useRecipeState({ isGuestMode });

    return <MobileRecipesPageContent {...recipeState} isGuestMode={isGuestMode} />;
}

export default function MobileRecipesPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileRecipesWrapper />
        </Suspense>
    );
}
