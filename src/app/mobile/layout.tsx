'use client';

import { Suspense, cloneElement } from 'react';
import { useSearchParams, useRouter }
from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Logo } from '@/components/icons/logo';
import dynamic from 'next/dynamic';
import { usePlannerState } from '@/hooks/use-planner-state';
import type { usePlannerState as PlannerStateHook } from '@/hooks/use-planner-state';


const MobileNav = dynamic(() => import('@/components/layout/mobile-nav').then(mod => mod.MobileNav), { ssr: false });

type PlannerState = ReturnType<typeof PlannerStateHook>;

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu plan...</p>
        </div>
    </div>
);


export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    <div className="flex flex-col min-h-screen">
      <PageHeader isGuest={isGuestMode} onRegisterClick={() => router.push('/')} />
      <main className="flex-1 pb-16">
        <Suspense fallback={<MobilePageLoader />}>
          {childrenWithProps}
        </Suspense>
      </main>
      <MobileNav />
    </div>
  )
}
