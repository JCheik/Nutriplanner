'use client';

import dynamic from 'next/dynamic';
import { Logo } from '@/components/icons/logo';
import type { usePlannerState } from '@/hooks/use-planner-state';

const MobileRecipesPageContent = dynamic(() => 
  import('@/components/nutri-planner/mobile-recipes-page-content').then(mod => mod.MobileRecipesPageContent), 
  { 
    ssr: false,
    loading: () => <MobilePageLoader />,
  }
);

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando recetas...</p>
        </div>
    </div>
);

type PlannerState = ReturnType<typeof usePlannerState>;

interface MobileRecipesPageProps {
  plannerState: PlannerState;
  isGuestMode: boolean;
}

export default function MobileRecipesPage({ plannerState, isGuestMode }: MobileRecipesPageProps) {
    return <MobileRecipesPageContent {...plannerState} isGuestMode={isGuestMode} />;
}
