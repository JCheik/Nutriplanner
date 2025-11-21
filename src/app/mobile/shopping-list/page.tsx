'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { INITIAL_WEEK_PLAN } from '@/lib/data';
import type { DayPlan } from '@/lib/types';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { Logo } from '@/components/icons/logo';

export default function MobileShoppingListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuestMode = searchParams.get('guest') === 'true';

  const { user, loading: userLoading } = useUser();
  const { firestore } = useFirebase();

  // --- Data Fetching ---
  const [guestWeekPlan] = useState<DayPlan[]>(INITIAL_WEEK_PLAN);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);

  const currentWeekPlan = useMemo(() => {
    return isGuestMode ? guestWeekPlan : weekPlanData || [];
  }, [isGuestMode, guestWeekPlan, weekPlanData]);
  
  if (userLoading || (!isGuestMode && weekPlanLoading)) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando lista...</p>
        </div>
      </div>
    );
  }
  
  if (!user && !isGuestMode) {
     router.replace('/');
     return null;
  }

  return (
    // The shopping list component is already styled like a floating sheet,
    // so we can reuse it directly here for the mobile page.
    <div className="p-4">
        <ShoppingListSheet 
            weekPlan={currentWeekPlan}
            isOpen={true}
            onOpenChange={() => {}} // In this page, it's always open.
        />
    </div>
  );
}
