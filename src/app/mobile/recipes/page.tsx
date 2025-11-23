'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { usePlannerState } from '@/hooks/use-planner-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';

export default function MobileRecipesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isGuestMode = searchParams.get('guest') === 'true';

    const plannerState = usePlannerState({ isGuestMode });
    
    if (plannerState.isLoading && !isGuestMode) {
        return null; // Or a loader
    }
    
    if (!isGuestMode && !plannerState.user && !plannerState.isLoading) {
        router.replace('/');
        return null;
    }

    return <MobileRecipesPageContent {...plannerState} />;
}
