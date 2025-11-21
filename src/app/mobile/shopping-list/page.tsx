'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { INITIAL_WEEK_PLAN } from '@/lib/data';
import type { DayPlan } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { ShoppingListContent } from '@/components/nutri-planner/shopping-list-content';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';
import { QRCodeDialog } from '@/components/nutri-planner/qr-code-dialog';

function MobileShoppingListPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuestMode = searchParams.get('guest') === 'true';

  const { user, loading: userLoading } = useUser();
  const { firestore } = useFirebase();

  const [isQrOpen, setIsQrOpen] = useState(false);

  // --- Data Fetching ---
  const [guestWeekPlan] = useState<DayPlan[]>(INITIAL_WEEK_PLAN);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);

  const currentWeekPlan = useMemo(() => {
    return isGuestMode ? guestWeekPlan : weekPlanData || [];
  }, [isGuestMode, guestWeekPlan, weekPlanData]);
  
  const shoppingListString = useMemo(() => {
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
    currentWeekPlan.forEach(dayPlan => {
      (dayPlan.meals || []).forEach(meal => {
        (meal.recipes || []).forEach(recipe => {
          (recipe.ingredients || []).forEach(ingredient => {
            const key = `${ingredient.name.toLowerCase().trim()}-${ingredient.unit}`;
            if (aggregated[key]) {
              aggregated[key].quantity += ingredient.quantity;
            } else {
              aggregated[key] = { ...ingredient };
            }
          });
        });
      });
    });
    const list = Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
    return list.map(item => `- ${item.quantity.toFixed(0)}${item.unit} ${item.name}`).join('\n');
  }, [currentWeekPlan]);

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
    <div className="p-4 flex flex-col h-full bg-notebook-paper">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold font-headline">Lista de la Compra</h1>
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsQrOpen(true)}
            disabled={!shoppingListString}
        >
            <Smartphone className="h-6 w-6" />
        </Button>
      </div>
      <ShoppingListContent weekPlan={currentWeekPlan} />

      <QRCodeDialog
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        qrValue={shoppingListString}
        title="Escanea para llevarte la lista"
        description="Abre la cámara de tu móvil y apunta al código QR para ver la lista de la compra."
      />
    </div>
  );
}

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);

export default function MobileShoppingListPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileShoppingListPageContent />
        </Suspense>
    );
}
