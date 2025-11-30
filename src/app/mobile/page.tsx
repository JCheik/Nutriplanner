'use client';

import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Logo } from '@/components/icons/logo';
import { usePlannerState } from '@/hooks/use-planner-state';
import type { usePlannerState as PlannerStateHook } from '@/hooks/use-planner-state';
import { PageHeader } from '@/components/layout/page-header';
import { Suspense } from 'react';

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

type PlannerState = ReturnType<typeof PlannerStateHook>;

function MobilePageWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isGuestMode = searchParams.get('guest') === 'true';

    const plannerState: PlannerState = usePlannerState({ isGuestMode });

    const handleExitGuestMode = () => {
        router.push('/');
    };

    if (plannerState.isLoading) {
        return <MobilePageLoader />;
    }

    if (!isGuestMode && !plannerState.user) {
        router.replace('/');
        return <MobilePageLoader />;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <PageHeader isGuest={isGuestMode} onRegisterClick={handleExitGuestMode} />
            <main className="flex-1 pb-16">
                 <MobilePageContent {...plannerState} isGuestMode={isGuestMode} />
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
