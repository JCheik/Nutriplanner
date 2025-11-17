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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Logo } from '@/components/icons/logo';

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
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(true);

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
        setIsLoginDialogOpen(true);
        return;
    }
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe,
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);
  
    const handleSaveRecipe = useCallback((recipe: Recipe) => {
        setIsLoginDialogOpen(true);
    }, []);

    const handleDeleteRecipe = useCallback((recipeId: string) => {
        setIsLoginDialogOpen(true);
    }, []);


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
    setIsLoginDialogOpen(true);
  }, []);


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
      
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-md" hideCloseButton={true}>
          <DialogHeader className="items-center text-center">
            <Logo className="h-12 w-12 text-primary" />
            <DialogTitle className="text-2xl">Bienvenido a NutriPlanner</DialogTitle>
            <DialogDescription>
              Inicia sesión para guardar tus recetas y planes de comidas.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={handleSignIn}
            className="w-full h-12 text-base"
            size="lg"
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.4 96 248 96c-84.3 0-152.3 67.8-152.3 152s68 152 152.3 152c92.8 0 140.3-61.5 143.8-92.6H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Iniciar Sesión con Google
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}