'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Recipe, WeekPlan, DialogState } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { signInWithGoogle, useUser } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase/provider';
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
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(true);
  
  useEffect(() => {
    if (user) {
      setIsLoginDialogOpen(false);
    } else {
      setIsLoginDialogOpen(true);
    }
  }, [user]);

  const handleSignIn = async () => {
    if (auth && firestore) {
      await signInWithGoogle(auth, firestore);
      // The user state will update via the provider, and the useEffect above will handle the dialog.
    }
  };

  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: dayPlan.meals.map(meal => 
                meal.id === mealId 
                  ? { ...meal, recipes: [...meal.recipes, droppedRecipe] }
                  : meal
              )
            }
          : dayPlan
      )
    );
  }, []);

  const handleClearMeal = useCallback((day: string, mealId: string) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: dayPlan.meals.map(meal => 
                meal.id === mealId
                  ? { ...meal, recipes: [] }
                  : meal
              )
            }
          : dayPlan
      )
    );
  }, []);

  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeId: string) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: dayPlan.meals.map(meal => 
                meal.id === mealId
                  ? { ...meal, recipes: meal.recipes.filter((r, i) => `${r.id}-${i}` !== `${recipeId}-${i}`) }
                                    : meal
              )
            }
          : dayPlan
      )
    );
  }, []);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
    if (action !== 'view') {
        setIsLoginDialogOpen(true);
        return;
    }
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe,
      isNutriPlannerRecipe,
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

    const handleCopyRecipe = useCallback((recipe: Recipe) => {
        setIsLoginDialogOpen(true);
    }, []);


  const dailyTotals = useMemo(() => {
    return weekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      dayPlan.meals.forEach(meal => {
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
              onUpdateMealTitle={() => setIsLoginDialogOpen(true)}
              onAddMeal={() => setIsLoginDialogOpen(true)}
              onDeleteMeal={() => setIsLoginDialogOpen(true)}
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RecipeLibrary
              userRecipes={recipes}
              nutriplannerRecipes={[]}
              onRecipeAction={handleRecipeAction}
              onCopyRecipe={handleCopyRecipe}
            />
          </div>
        </div>
      </main>
      <RecipeDialog
        dialogState={dialogState}
        isSaving={false}
        onClose={handleDialogClose}
        onSave={() => setIsLoginDialogOpen(true)}
        onDelete={() => setIsLoginDialogOpen(true)}
        onEdit={(recipe) => handleRecipeAction('edit', recipe)}
        onCopy={handleCopyRecipe}
      />
      
      <Dialog open={isLoginDialogOpen}>
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
