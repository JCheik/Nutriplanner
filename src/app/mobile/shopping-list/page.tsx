'use client';

import { Suspense } from 'react';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { MobileShoppingListPageContent } from '@/components/nutri-planner/mobile-shopping-list-page-content';
import { Logo } from '@/components/icons/logo';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando lista...</p>
        </div>
    </div>
);

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
