'use client';

// This page uses client-side hooks for search params and authentication.
// It must be rendered dynamically.
export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { NUTRIPLANNER_RECIPES_DATA } from '@/lib/data';
import type { DayPlan, Meal, Recipe, RecipeInstance } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecipeCard } from '@/components/nutri-planner/recipe-card';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { ChevronLeft, ChevronRight, BookHeart, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePlannerState } from '@/hooks/use-planner-state';

function MobilePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuestMode = searchParams.get('guest') === 'true';

  const {
    currentUserRecipes,
    nutriplannerRecipes,
    currentWeekPlan,
    isLoading,
    setGuestWeekPlan
  } = usePlannerState({ isGuestMode });
  
  const { firestore, user } = useFirebase();

  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [dialogState, setDialogState] = useState<any>({ open: false });
  
  useEffect(() => {
    // Initialize date only on the client to avoid hydration mismatch
    setCurrentDate(new Date());
  }, []);
  
  const activeDayName = useMemo(() => {
    if (!currentDate) return '';
    const dayMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayMap[currentDate.getDay()];
  }, [currentDate]);

  const activeDayPlan = useMemo(() => {
    if (!currentWeekPlan || !activeDayName) return null;
    return currentWeekPlan.find(d => d.day === activeDayName) || { day: activeDayName as DayPlan['day'], meals: [] };
  }, [currentWeekPlan, activeDayName]);
  
  const handleDateChange = (direction: -1 | 1) => {
    setCurrentDate(prev => {
        if (!prev) return new Date();
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + direction);
        return newDate;
    });
  };
  
  const handleRecipeClick = (recipe: Recipe, meal: Meal) => {
    setDialogState({ 
      open: true, 
      mode: 'view', 
      recipe, 
      context: { 
        mealId: meal.id, 
        recipeInstanceId: (recipe as RecipeInstance).instanceId, 
        source: 'mobile-planner' 
      } 
    });
  };

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsRecipeSelectorOpen(true);
  };
  
  const handleRecipeSelectionSave = (updatedRecipes: Recipe[]) => {
    if (!selectedMeal) return;

    const finalRecipeInstances: RecipeInstance[] = updatedRecipes.map(recipe => {
      const existing = selectedMeal.recipes.find(r => r.id === recipe.id);
      return existing || { ...recipe, instanceId: self.crypto.randomUUID() };
    });

    if (isGuestMode) {
        setGuestWeekPlan(prevPlan => 
            prevPlan.map(day => 
                day.day !== activeDayName ? day : {
                    ...day,
                    meals: day.meals.map(m => m.id === selectedMeal?.id ? { ...m, recipes: finalRecipeInstances } : m)
                }
            )
        );
    } else if (user && firestore && activeDayPlan) {
        const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', activeDayName);
        const updatedMeals = activeDayPlan.meals.map(meal => 
            meal.id === selectedMeal.id ? { ...meal, recipes: finalRecipeInstances } : meal
        );
        setDoc(dayDocRef, { ...activeDayPlan, meals: updatedMeals }, { merge: true });
    }
    
    setIsRecipeSelectorOpen(false);
    setSelectedMeal(null);
  };

  const handleRemoveRecipe = useCallback((mealId: string, recipeInstanceId: string) => {
    const updatePlan = (plan: DayPlan[]): DayPlan[] => 
      plan.map(day => 
        day.day !== activeDayName ? day : {
          ...day,
          meals: day.meals.map(m => 
            m.id === mealId ? { ...m, recipes: m.recipes.filter(r => r.instanceId !== recipeInstanceId) } : m
          )
        }
      );
    
    if (isGuestMode) {
      setGuestWeekPlan(updatePlan);
    } else if (user && firestore && activeDayPlan) {
      const updatedMeals = updatePlan(currentWeekPlan).find(d => d.day === activeDayName)?.meals || [];
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', activeDayName);
      setDoc(dayDocRef, { ...activeDayPlan, meals: updatedMeals }, { merge: true });
    }
    
    setDialogState({ open: false });
  }, [user, firestore, activeDayName, activeDayPlan, isGuestMode, currentWeekPlan, setGuestWeekPlan]);


  if (isLoading || !currentDate) {
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
  const dayMeals = activeDayPlan?.meals || [];

  return (
    <>
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="icon" onClick={() => handleDateChange(-1)}>
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center">
                 <h1 className="text-2xl font-bold font-headline capitalize">{formattedDate.split(',')[0]}</h1>
                 <p className="text-muted-foreground">{formattedDate.split(',')[1]}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDateChange(1)}>
                <ChevronRight className="h-6 w-6" />
            </Button>
        </div>
        
        <div className="space-y-4">
            {dayMeals.length > 0 ? dayMeals.map((meal: Meal) => (
                <Card key={meal.id} onClick={() => handleMealClick(meal)} className='cursor-pointer hover:bg-muted/50'>
                    <CardHeader className="pb-2">
                       <CardTitle className="text-base text-muted-foreground">{meal.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {meal.recipes && meal.recipes.length > 0 ? (
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
                        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg text-center p-2">
                          <BookHeart className="h-6 w-6 text-muted-foreground mb-1" />
                          <p className="text-sm text-muted-foreground">Toca para añadir recetas</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
            )) : (
                 <div className="flex flex-col items-center justify-center h-60 text-center p-4 border-2 border-dashed rounded-lg">
                    <p className="font-semibold">No hay comidas en este día.</p>
                    <p className="text-sm text-muted-foreground mt-1">Puedes añadirlas desde la versión de escritorio.</p>
                </div>
            )}
        </div>

      </div>

      <RecipeDialog
        dialogState={dialogState}
        onClose={() => setDialogState({ open: false })}
        onRemoveFromMeal={(context) => {
            if (context.mealId && context.recipeInstanceId) {
                handleRemoveRecipe(context.mealId, context.recipeInstanceId);
            }
        }}
        isMobile={true}
      />
      
      {selectedMeal && (
        <RecipeSelectionDialog
            isOpen={isRecipeSelectorOpen}
            onClose={() => setIsRecipeSelectorOpen(false)}
            meal={selectedMeal}
            allRecipes={[...currentUserRecipes, ...nutriplannerRecipes]}
            onSave={handleRecipeSelectionSave}
        />
      )}
    </>
  );
}

export default function MobilePage() {
  return <MobilePageContent />
}
