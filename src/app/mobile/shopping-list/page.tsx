'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { usePlannerState } from '@/hooks/use-planner-state';
import dynamic from 'next/dynamic';
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

export default function MobileShoppingListPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isGuestMode = searchParams.get('guest') === 'true';

    const { currentWeekPlan, currentShoppingList, handleShoppingListUpdate, isLoading, user } = usePlannerState({ isGuestMode });

    if (!isGuestMode && !isLoading && !user) {
      router.replace('/');
      return <MobilePageLoader />;
    }

    return (
      <MobileShoppingListPageContent 
        currentWeekPlan={currentWeekPlan}
        currentShoppingList={currentShoppingList}
        handleShoppingListUpdate={handleShoppingListUpdate}
      />
    );
}
