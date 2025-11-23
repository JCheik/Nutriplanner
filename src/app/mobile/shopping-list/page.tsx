'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { usePlannerState } from '@/hooks/use-planner-state';
import { MobileShoppingListPageContent } from '@/components/nutri-planner/mobile-shopping-list-page-content';

export default function MobileShoppingListPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isGuestMode = searchParams.get('guest') === 'true';

    const plannerState = usePlannerState({ isGuestMode });

    if (plannerState.isLoading && !isGuestMode) {
      return null;
    }

    if (!isGuestMode && !plannerState.user && !plannerState.isLoading) {
      router.replace('/');
      return null;
    }

    return <MobileShoppingListPageContent {...plannerState} />;
}
