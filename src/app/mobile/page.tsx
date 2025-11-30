'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { MobilePageContent } from '@/components/nutri-planner/mobile-page-content';
import { Logo } from '@/components/icons/logo';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu plan...</p>
        </div>
    </div>
);

function MobilePageWrapper() {
    const searchParams = useSearchParams();
    const isGuestMode = searchParams.get('guest') === 'true';

    const recipeState = useRecipeState({ isGuestMode });
    const weekPlanState = useWeekPlanState({ isGuestMode });
    
    const combinedState = {
        ...recipeState,
        ...weekPlanState,
    };

    return <MobilePageContent {...combinedState} isGuestMode={isGuestMode} />;
}

export default function MobilePage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobilePageWrapper />
        </Suspense>
    )
}
