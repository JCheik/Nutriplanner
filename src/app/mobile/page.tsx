'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Logo } from '@/components/icons/logo';

// This is now a simple presenter component.
const MobilePageContent = dynamic(() => 
  import('@/components/nutri-planner/mobile-page-content').then(mod => mod.MobilePageContent), 
  { 
    ssr: false,
    loading: () => <MobilePageLoader />,
  }
);

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu plan...</p>
        </div>
    </div>
);

function MobilePageWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isGuestMode = searchParams.get('guest') === 'true';

    const { user, loading: userLoading } = useUser();
    const recipeState = useRecipeState({ isGuestMode });
    const weekPlanState = useWeekPlanState({ isGuestMode });
    
    const isLoading = userLoading || weekPlanState.weekPlanLoading;

    useEffect(() => {
        if (!isLoading && !isGuestMode && !user) {
            router.replace('/');
        }
    }, [isLoading, isGuestMode, user, router]);

    if (isLoading || (!isGuestMode && !user)) {
        return <MobilePageLoader />;
    }

    const handleExitGuestMode = () => {
        router.push('/');
    };

    const combinedState = {
        ...recipeState,
        ...weekPlanState,
        user,
    };

    return (
        <div className="flex flex-col min-h-screen">
            <PageHeader isGuest={isGuestMode} onRegisterClick={handleExitGuestMode} />
            <main className="flex-1 pb-16">
                 <MobilePageContent {...combinedState} isGuestMode={isGuestMode} />
            </main>
        </div>
    )
}

export default function MobilePage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobilePageWrapper />
        </Suspense>
    )
}
