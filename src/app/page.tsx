'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Recipe, WeekPlan, MealType, DialogState } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });

  const handleDrop = useCallback((day: string, mealType: MealType, droppedRecipe: Recipe) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipe: droppedRecipe },
              },
            }
          : dayPlan
      )
    );
  }, []);
  
  const handleClearMeal = useCallback((day: string, mealType: MealType) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipe: null },
              },
            }
          : dayPlan
      )
    );
  }, []);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe) => {
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe || undefined,
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    setRecipes(prevRecipes => {
      const exists = prevRecipes.some(r => r.id === recipe.id);
      if (exists) {
        return prevRecipes.map(r => (r.id === recipe.id ? recipe : r));
      }
      return [...prevRecipes, recipe];
    });
    toast({
      title: '¡Receta guardada!',
      description: `${recipe.name} se ha guardado en tu biblioteca.`,
    });
    handleDialogClose();
  }, [handleDialogClose, toast]);

  const handleDeleteRecipe = useCallback((recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    setWeekPlan(prevPlan => 
      prevPlan.map(dayPlan => ({
        ...dayPlan,
        meals: {
          breakfast: dayPlan.meals.breakfast.recipe?.id === recipeId ? { ...dayPlan.meals.breakfast, recipe: null } : dayPlan.meals.breakfast,
          lunch: dayPlan.meals.lunch.recipe?.id === recipeId ? { ...dayPlan.meals.lunch, recipe: null } : dayPlan.meals.lunch,
          snack: dayPlan.meals.snack.recipe?.id === recipeId ? { ...dayPlan.meals.snack, recipe: null } : dayPlan.meals.snack,
          dinner: dayPlan.meals.dinner.recipe?.id === recipeId ? { ...dayPlan.meals.dinner, recipe: null } : dayPlan.meals.dinner,
        }
      }))
    );
    handleDialogClose();
  }, [handleDialogClose]);

  const dailyTotals = useMemo(() => {
    return weekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      Object.values(dayPlan.meals).forEach(meal => {
        if (meal.recipe) {
          totals.calories += meal.recipe.calories;
          totals.protein += meal.recipe.protein;
          totals.carbs += meal.recipe.carbs;
          totals.fat += meal.recipe.fat;
        }
      });
      return { day: dayPlan.day, totals };
    });
  }, [weekPlan]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <PageHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
          <div className="w-full">
            <MealPlanner
              weekPlan={weekPlan}
              dailyTotals={dailyTotals}
              onDrop={handleDrop}
              onClearMeal={handleClearMeal}
              onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RecipeLibrary recipes={recipes} onRecipeAction={handleRecipeAction} />
          </div>
        </div>
      </main>
      <RecipeDialog
        dialogState={dialogState}
        onClose={handleDialogClose}
        onSave={handleSaveRecipe}
        onDelete={handleDeleteRecipe}
        onEdit={(recipe) => handleRecipeAction('edit', recipe)}
      />
    </div>
  );
}
