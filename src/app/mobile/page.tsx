'use client';

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useDoc, useFirebase, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { DayPlan, Meal, Recipe, RecipeInstance, UserProfile } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecipeCard } from '@/components/nutri-planner/recipe-card';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MobileNav } from '@/components/layout/mobile-nav';

const DAY_NAMES_ORDER = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TodayMeals = ({ dayPlan, onMealClick, isGuestMode, onRemoveRecipe }: { dayPlan: DayPlan | null, onMealClick: (meal: Meal) => void, isGuestMode: boolean, onRemoveRecipe: (mealId: string, recipeInstanceId: string) => void }) => {
  const [dialogState, setDialogState] = useState<any>({ open: false });

  const handleRecipeClick = (recipe: Recipe, meal: Meal) => {
    setDialogState({ open: true, mode: 'view', recipe, context: { mealId: meal.id, source: 'mobile-planner' } });
  };
  
  if (!dayPlan) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No se encontró el plan de este día. ¡Añade algunas recetas!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(dayPlan.meals || []).map((meal: Meal) => (
        <Card key={meal.id} onClick={() => !isGuestMode && onMealClick(meal)} className={isGuestMode ? '' : 'cursor-pointer hover:bg-muted/50'}>
            <CardHeader className="pb-2">
               <CardTitle className="text-base text-muted-foreground">{meal.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {meal.recipes.length > 0 ? (
                <div className="space-y-2">
                  {meal.recipes.map((recipe: RecipeInstance) => (
                    <div key={recipe.instanceId} className="h-16">
                      <RecipeCard
                        recipe={recipe}
                        onClick={(e) => { e.stopPropagation(); handleRecipeClick(recipe, meal); }}
                        isCompact
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="flex items-center justify-center h-24 border-2 border-dashed">
                  <p className="text-sm text-muted-foreground">Toca para añadir recetas</p>
                </Card>
              )}
            </CardContent>
        </Card>
      ))}
      <RecipeDialog
        dialogState={dialogState}
        onClose={() => setDialogState({ open: false })}
        onRemoveFromMeal={(context) => {
            if (context.mealId && context.recipeInstanceId) {
                onRemoveRecipe(context.mealId, context.recipeInstanceId);
                setDialogState({ open: false });
            }
        }}
        isMobile={true}
      />
    </div>
  );
};


function MobilePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuestMode = searchParams.get('guest') === 'true';

  const { user, loading: userLoading } = useUser();
  const { firestore } = useFirebase();
  
  // --- State for day navigation ---
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- State for meal editing ---
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);

  // --- Data Fetching ---
  const [guestWeekPlan, setGuestWeekPlan] = useState<DayPlan[]>(INITIAL_WEEK_PLAN);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes } = useCollection<Recipe>(userRecipesCollectionRef);

  const nutriplannerRecipesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_recipes') : null, [firestore]);
  const { data: nutriplannerRecipes } = useCollection<Recipe>(nutriplannerRecipesCollectionRef);

  const activeDayName = useMemo(() => {
    const dayIndex = currentDate.getDay();
    return DAY_NAMES_ORDER[dayIndex];
  }, [currentDate]);

  const activeDayPlan = useMemo(() => {
    const sourcePlan = isGuestMode ? guestWeekPlan : (weekPlanData || INITIAL_WEEK_PLAN);
    if (!sourcePlan) return null;
    return sourcePlan.find(d => d.day === activeDayName) || { day: activeDayName as DayPlan['day'], meals: [] };
  }, [isGuestMode, guestWeekPlan, weekPlanData, activeDayName]);
  
  const handlePrevDay = () => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 1);
        return newDate;
    });
  };

  const handleNextDay = () => {
     setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
    });
  };

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsRecipeSelectorOpen(true);
  };
  
  const handleRecipeSelectionSave = (updatedRecipes: Recipe[]) => {
    if (!user || !firestore || !activeDayPlan || !selectedMeal) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', activeDayName);
    
    const updatedMeals = activeDayPlan.meals.map(meal => {
        if (meal.id === selectedMeal.id) {
            const newRecipeInstances: RecipeInstance[] = updatedRecipes.map(r => ({
                ...r,
                instanceId: self.crypto.randomUUID()
            }));
            return { ...meal, recipes: newRecipeInstances };
        }
        return meal;
    });
    
    const updatedDayPlan = { ...activeDayPlan, meals: updatedMeals };
    setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    setIsRecipeSelectorOpen(false);
    setSelectedMeal(null);
  };

  const handleRemoveRecipe = useCallback((mealId: string, recipeInstanceId: string) => {
    if (!user || !firestore || !activeDayPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', activeDayName);
    const updatedMeals = activeDayPlan.meals.map(meal => {
        if (meal.id === mealId) {
            return {
                ...meal,
                recipes: meal.recipes.filter(r => r.instanceId !== recipeInstanceId)
            };
        }
        return meal;
    });
    
    const updatedDayPlan = { ...activeDayPlan, meals: updatedMeals };
    setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
  }, [user, firestore, activeDayName, activeDayPlan]);

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
  
  const formattedDate = format(currentDate, "EEEE, d 'de' MMMM", { locale: es });

  return (
    <>
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center">
                 <h1 className="text-2xl font-bold font-headline capitalize">{formattedDate.split(',')[0]}</h1>
                 <p className="text-muted-foreground">{formattedDate.split(',')[1]}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-6 w-6" />
            </Button>
        </div>
        
        <TodayMeals dayPlan={activeDayPlan} onMealClick={handleMealClick} isGuestMode={isGuestMode} onRemoveRecipe={handleRemoveRecipe}/>
      </div>

      {selectedMeal && (
        <RecipeSelectionDialog
            isOpen={isRecipeSelectorOpen}
            onClose={() => setIsRecipeSelectorOpen(false)}
            meal={selectedMeal}
            allRecipes={[...(userRecipes || []), ...(nutriplannerRecipes || [])]}
            onSave={handleRecipeSelectionSave}
        />
      )}
    </>
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
