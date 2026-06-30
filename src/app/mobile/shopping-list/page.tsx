'use client';

import { Suspense } from 'react';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { MobileShoppingListPageContent } from '@/components/nutri-planner/mobile-shopping-list-page-content';
import { MobileLoader } from '@/components/layout/mobile-loader';

const MobilePageLoader = () => <MobileLoader label="Cargando tu lista…" />;

function MobileShoppingListWrapper() {
    const weekPlanState = useWeekPlanState();
    const userProfileState = useUserProfileState();
    
    const combinedState = {
        ...weekPlanState,
        ...userProfileState,
    };

    return <MobileShoppingListPageContent {...combinedState} />;
}

export default function MobileShoppingListPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileShoppingListWrapper />
        </Suspense>
    );
}
