'use client';

import { useState, useMemo, useEffect, Suspense, Key } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useDoc, useFirebase, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { DayPlan, Meal, Recipe, RecipeInstance, UserProfile } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecipeCard } from '@/components/nutri-planner/recipe-card';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TodayMeals = ({ dayPlan }: { dayPlan: DayPlan | null }) => {
  const [dialogState, setDialogState] = useState<any>({ open: false });

  const handleRecipeClick = (recipe: Recipe) => {
    setDialogState({ open: true, mode: 'view', recipe });
  };

  if (!dayPlan) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No se encontró el plan de hoy. ¡Añade algunas recetas!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {dayPlan.meals.map((meal: Meal) => (
          <div key={meal.id}>
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">{meal.title}</h3>
            {meal.recipes.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {meal.recipes.map((recipe: RecipeInstance) => (
                  <RecipeCard
                    key={recipe.instanceId}
                    recipe={recipe}
                    onClick={() => handleRecipeClick(recipe)}
                  />
                ))}
              </div>
            ) : (
              <Card className="flex items-center justify-center h-24 border-2 border-dashed">
                <p className="text-sm text-muted-foreground">Sin recetas</p>
              </Card>
            )}
          </div>
        ))}
      </div>
      <RecipeDialog
        dialogState={dialogState}
        isSaving={false}
        folders={[]}
        globalFolders={[]}
        onClose={() => setDialogState({ open: false })}
        onSave={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
        onCopy={() => {}}
      />
    </>
  );
};


function MobilePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuestMode = searchParams.get('guest') === 'true';

  const { user, loading: userLoading } = useUser();
  const { firestore } = useFirebase();

  // --- Data Fetching ---
  const [guestWeekPlan, setGuestWeekPlan] = useState<DayPlan[]>(INITIAL_WEEK_PLAN);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  const today = useMemo(() => {
    const dayIndex = new Date().getDay();
    return DAY_NAMES[dayIndex];
  }, []);

  const todayPlan = useMemo(() => {
    const sourcePlan = isGuestMode ? guestWeekPlan : weekPlanData;
    if (!sourcePlan) return null;
    return sourcePlan.find(d => d.day === today) || null;
  }, [isGuestMode, guestWeekPlan, weekPlanData, today]);

  if (userLoading || (!isGuestMode && weekPlanLoading)) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu plan...</p>
        </div>
      </div>
    );
  }
  
  if (!user && !isGuestMode) {
     router.replace('/');
     return null;
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold font-headline mb-1">Hoy es {today}</h1>
      <p className="text-muted-foreground mb-6">Este es tu plan de comidas para hoy.</p>
      
      <TodayMeals dayPlan={todayPlan} />
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

export default function MobileHomePage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobilePageContent />
        </Suspense>
    );
}
