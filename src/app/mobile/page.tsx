'use client';

import { usePlannerState } from '@/hooks/use-planner-state';
import { useSearchParams, useRouter } from 'next/navigation';
import { MobilePageContent } from '@/components/nutri-planner/mobile-page-content';

export default function MobilePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isGuestMode = searchParams.get('guest') === 'true';

    const plannerState = usePlannerState({ isGuestMode });

    if (plannerState.isLoading) {
        // You can return a loader here if needed, although Suspense in layout handles it
        return null; 
    }
    
    // Redirect if not guest and not logged in (logic from previous state)
    if (!isGuestMode && !plannerState.isLoading && !plannerState.user) {
        router.replace('/');
        return null;
    }

    return <MobilePageContent {...plannerState} />;
}
