'use client';

import { useState, useMemo, useCallback } from 'react';
import type { DayPlan, Meal, Recipe, RecipeInstance } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecipeCard } from '@/components/nutri-planner/recipe-card';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { usePlannerState } from '@/hooks/use-planner-state';

type PlannerState = ReturnType<typeof usePlannerState>;

interface MobilePageContentProps extends PlannerState {
  isGuestMode: boolean;
}

export function MobilePageContent({
  currentUserRecipes,
  nutriplannerRecipes,
  currentWeekPlan,
  isGuestMode,
  handleDrop,
  handleRemoveRecipeFromMeal
}: MobilePageContentProps) {
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  
  const activeDayName = useMemo(() => {
    const dayMap: DayPlan['day'][] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayMap[currentDate.getDay()];
  }, [currentDate]);

  const activeDayPlan = useMemo(() => {
    return currentWeekPlan.find(d => d.day === activeDayName) || null;
  }, [currentWeekPlan, activeDayName]);
  
  const handleDateChange = (direction: -1 | 1) => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + direction);
        return newDate;
    });
  };
  
  const handleRecipeClick = (recipe: Recipe) => {
    setDialogState({ open: true, mode: 'view', recipe });
  };

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsRecipeSelectorOpen(true);
  };
  
  const handleRecipeSelectionSave = (updatedRecipes: Recipe[]) => {
    if (!selectedMeal) return;
    
    // Add new recipes
    updatedRecipes.forEach(recipe => {
        handleDrop(activeDayName, selectedMeal.id, recipe);
    });
    
    setIsRecipeSelectorOpen(false);
    setSelectedMeal(null);
  };

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);

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
                <Card key={meal.id} onClick={() => handleMealClick(meal)} className='cursor-pointer bg-card hover:bg-muted/50'>
                    <CardHeader className="pb-2">
                       <CardTitle className="text-base text-muted-foreground">{meal.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {meal.recipes && meal.recipes.length > 0 ? (
                        <div className="space-y-2">
                          {meal.recipes.map((recipe: RecipeInstance) => (
                            <div key={recipe.instanceId} className="flex items-center gap-2">
                              <div className="h-16 flex-1">
                                <RecipeCard
                                  recipe={recipe}
                                  onClick={(e) => { e.stopPropagation(); handleRecipeClick(recipe); }}
                                  isCompact
                                  className="text-sm"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveRecipeFromMeal(activeDayName, meal.id, recipe.instanceId);
                                }}
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg text-center p-2">
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
        onClose={handleDialogClose}
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
