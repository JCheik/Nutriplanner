'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { usePlannerState } from '@/hooks/use-planner-state';
import type { usePlannerState as PlannerStateHook } from '@/hooks/use-planner-state';
import { cloneElement, type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Logo } from '@/components/icons/logo';

type PlannerState = ReturnType<typeof PlannerStateHook>;

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu plan...</p>
        </div>
    </div>
);


export function MobileLayoutContent({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isGuestMode = searchParams.get('guest') === 'true';

    const plannerState: PlannerState = usePlannerState({ isGuestMode });

    if (plannerState.isLoading) {
        return <MobilePageLoader />;
    }

    if (!isGuestMode && !plannerState.user) {
        router.replace('/');
        return <MobilePageLoader />;
    }
    
    // Clone the child component and pass the plannerState as a prop
    const childrenWithProps = cloneElement(children as React.ReactElement, { plannerState, isGuestMode });

    return (
        <>
            <PageHeader isGuest={isGuestMode} onRegisterClick={() => router.push('/')} />
            <main className="flex-1 pb-16">
                {childrenWithProps}
            </main>
            <MobileNav />
        </>
    );
}
