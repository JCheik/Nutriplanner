'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Recipe, WeekPlan, MealType, DialogState, SortCriteria } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { AiSuggesterDialog } from '@/components/nutri-planner/ai-suggester-dialog';
import { suggestRecipes } from '@/ai/flows/suggest-recipes';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase';

export default function LandingPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [filterQuery, setFilterQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');
  const [isSuggesterOpen, setIsSuggesterOpen] = useState(false);

  const handleSignIn = () => {
    if (auth && firestore) {
      signInWithGoogle(auth, firestore);
    }
  };

  const handleDrop = useCallback((day: string, mealType: MealType, droppedRecipe: Recipe) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipes: [...dayPlan.meals[mealType].recipes, droppedRecipe] },
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
                [mealType]: { ...dayPlan.meals[mealType], recipes: [] },
              },
            }
          : dayPlan
      )
    );
  }, []);

  const handleRemoveRecipeFromMeal = useCallback((day: string, mealType: MealType, recipeId: string) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: {
                  ...dayPlan.meals[mealType],
                  recipes: dayPlan.meals[mealType].recipes.filter(r => r.id !== recipeId)
                },
              },
            }
          : dayPlan
      )
    );
  }, []);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe) => {
    if (action !== 'view') {
        handleSignIn();
        return;
    }
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe,
    });
  }, [auth, firestore]);

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);
  
    const handleSaveRecipe = useCallback((recipe: Recipe) => {
        handleSignIn();
    }, [auth, firestore]);

    const handleDeleteRecipe = useCallback((recipeId: string) => {
        handleSignIn();
    }, [auth, firestore]);


  const dailyTotals = useMemo(() => {
    return weekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      Object.values(dayPlan.meals).forEach(meal => {
        meal.recipes.forEach(recipe => {
          totals.calories += recipe.calories;
          totals.protein += recipe.protein;
          totals.carbs += recipe.carbs;
          totals.fat += recipe.fat;
        });
      });
      return { day: dayPlan.day, totals };
    });
  }, [weekPlan]);

  const filteredAndSortedRecipes = useMemo(() => {
    const filtered = recipes.filter(recipe => {
      const query = filterQuery.toLowerCase();
      if (!query) return true;
      const nameMatch = recipe.name.toLowerCase().includes(query);
      const ingredientMatch = recipe.ingredients.some(ing => ing.name.toLowerCase().includes(query));
      return nameMatch || ingredientMatch;
    });

    const [key, order] = sortCriteria.split('-') as [keyof Recipe, 'asc' | 'desc'];

    return filtered.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [recipes, filterQuery, sortCriteria]);

  const handleAddSuggestedRecipes = useCallback((suggestedRecipes: Recipe[]) => {
    handleSignIn();
  }, [auth, firestore]);


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
              onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RecipeLibrary
              recipes={filteredAndSortedRecipes}
              onRecipeAction={handleRecipeAction}
              onSuggestClick={() => setIsSuggesterOpen(true)}
              filterQuery={filterQuery}
              onFilterChange={setFilterQuery}
              sortCriteria={sortCriteria}
              onSortChange={setSortCriteria}
            />
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
      <AiSuggesterDialog
        isOpen={isSuggesterOpen}
        onClose={() => setIsSuggesterOpen(false)}
        onSuggest={suggestRecipes}
        onAddRecipes={handleAddSuggestedRecipes}
        onEditRecipe={(recipe) => handleRecipeAction('edit', recipe)}
      />
      
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={handleSignIn}
          className="h-16 rounded-full shadow-lg text-lg px-8"
          size="lg"
        >
          Inicia sesión para probar NutriPlanner
        </Button>
      </div>
    </div>
  );
}
