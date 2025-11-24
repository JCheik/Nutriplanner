'use client';

import dynamic from 'next/dynamic';
import { Logo } from '@/components/icons/logo';
import type { usePlannerState } from '@/hooks/use-planner-state';

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

type PlannerState = ReturnType<typeof usePlannerState>;

interface MobileShoppingListPageProps {
  plannerState: PlannerState;
}

export default function MobileShoppingListPage({ plannerState }: MobileShoppingListPageProps) {
    const { currentWeekPlan, currentShoppingList, handleShoppingListUpdate } = plannerState;

    return (
      <MobileShoppingListPageContent 
        currentWeekPlan={currentWeekPlan}
        currentShoppingList={currentShoppingList}
        onListChange={handleShoppingListUpdate}
      />
    );
}
