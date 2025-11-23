'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { usePlannerState } from '@/hooks/use-planner-state';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/icons/logo';

// Dynamically import the content to ensure hooks like useSearchParams are client-side only
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

export default function MobilePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isGuestMode = searchParams.get('guest') === 'true';

    const plannerState = usePlannerState({ isGuestMode });

    // Redirect if not guest and not logged in (logic from previous state)
    // This needs to be handled within the hook or a client component after loading.
    if (!isGuestMode && !plannerState.isLoading && !plannerState.user) {
        router.replace('/');
        return <MobilePageLoader />;
    }

    return <MobilePageContent {...plannerState} isGuestMode={isGuestMode} />;
}
