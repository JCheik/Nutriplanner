'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Logo } from '@/components/icons/logo';

const MobileShoppingListPageContent = dynamic(() =>
    import('@/components/nutri-planner/mobile-shopping-list-page-content').then(mod => mod.MobileShoppingListPageContent),
    {
        ssr: false,
        loading: () => <MobilePageLoader />,
    }
);

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando lista...</p>
        </div>
    </div>
);

function MobileShoppingListWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isGuestMode = searchParams.get('guest') === 'true';

    const { user, loading: userLoading } = useUser();
    const weekPlanState = useWeekPlanState({ isGuestMode });
    const userProfileState = useUserProfileState({ isGuestMode });

    const isLoading = userLoading || weekPlanState.weekPlanLoading;

    useEffect(() => {
        if (!isLoading && !isGuestMode && !user) {
            router.replace('/');
        }
    }, [isLoading, isGuestMode, user, router]);

    if (isLoading || (!isGuestMode && !user)) {
        return <MobilePageLoader />;
    }
    
    const combinedState = {
        ...weekPlanState,
        ...userProfileState,
    };

    return (
        <>
            <PageHeader isGuest={isGuestMode} onRegisterClick={() => router.push('/')} />
            <main className="flex-1 pb-16 h-[calc(100vh-4rem)]">
                <MobileShoppingListPageContent {...combinedState} />
            </main>
        </>
    );
}

export default function MobileShoppingListPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileShoppingListWrapper />
        </Suspense>
    );
}
