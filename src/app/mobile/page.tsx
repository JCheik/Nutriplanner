'use client';

import dynamic from 'next/dynamic';
import { Logo } from '@/components/icons/logo';
import type { usePlannerState } from '@/hooks/use-planner-state';
import { usePlannerState as usePlannerStateHook } from '@/hooks/use-planner-state';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';

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

type PlannerState = ReturnType<typeof usePlannerStateHook>;

interface MobilePageProps {
  isGuestMode: boolean;
  onExitGuestMode: () => void;
}

// The page now receives props from the layout.
export default function MobilePage({ isGuestMode, onExitGuestMode }: MobilePageProps) {
    const plannerState: PlannerState = usePlannerStateHook({ isGuestMode });
    const router = useRouter();
    
    if (plannerState.isLoading) {
        return <MobilePageLoader />;
    }

    if (!isGuestMode && !plannerState.user) {
        router.replace('/');
        return <MobilePageLoader />;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <PageHeader isGuest={isGuestMode} onRegisterClick={onExitGuestMode} />
            <main className="flex-1 pb-16">
                 <MobilePageContent {...plannerState} isGuestMode={isGuestMode} />
            </main>
        </div>
    )
}
