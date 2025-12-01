'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Recipe, DialogState, ActiveDropTarget } from '@/lib/types';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { StickyNote } from '@/components/nutri-planner/sticky-note';
import { FloatingGoals } from '@/components/nutri-planner/floating-goals';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { FloatingMenu } from '@/components/nutri-planner/floating-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useUser } from '@/firebase';


export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();
  
  const isGuestMode = searchParams.get('guest') === 'true';
  
  useEffect(() => {
    // This effect runs only on the client after hydration
    if (!userLoading && !user && !isGuestMode) {
      router.replace('/');
    }
  }, [userLoading, user, isGuestMode, router]);


  // --- Decomposed State Hooks ---
  const recipeState = useRecipeState({ isGuestMode });
  const weekPlanState = useWeekPlanState({ isGuestMode });
  const userProfileState = useUserProfileState({ isGuestMode });

  const {
    currentUserRecipes,
    nutriplannerRecipes,
    currentFolders,
    isSaving,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
    handleFolderCreate,
    handleFolderDelete,
    handleFolderUpdate,
    handleAssignRecipeToFolder,
  } = recipeState;

  const {
    currentWeekPlan,
    handleDrop,
    handleClearMeal,
    handleRemoveRecipeFromMeal,
    handleUpdateMealTitle,
    handleAddMeal,
    handleDeleteMeal,
  } = weekPlanState;

  const {
    currentStickyNote,
    currentCalorieResult,
    activeGoalMacros,
    currentShoppingList,
    activeGoal,
    handleNoteSave,
    handleCalorieResultSave,
    handleActiveGoalChange,
    handleSaveCustomGoal,
    handleShoppingListUpdate,
  } = userProfileState;

  // Dialog and UI state
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activePanel, setActivePanel] = useState<'goals' | 'shopping-list' | 'sticky-note' | null>(null);
  const [isGuestPromptOpen, setIsGuestPromptOpen] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState<ActiveDropTarget | null>(null);
  
  // --- Guest Mode Interaction ---
  const promptToRegister = useCallback(() => {
    if (isGuestMode) {
      setIsGuestPromptOpen(true);
      return true; // Indicates that the prompt was shown
    }
    return false; // Indicates that the user is logged in
  }, [isGuestMode]);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
    if ((action === 'create' || action === 'edit') && promptToRegister()) {
        return;
    }
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe || undefined,
      isNutriPlannerRecipe,
    } as DialogState);
  }, [promptToRegister]);
  
  const handleAddToPlan = (recipe: Recipe) => {
    if (activeDropTarget) {
      handleDrop(activeDropTarget.day, activeDropTarget.mealId, recipe);
      setActiveDropTarget(null); // Clear target after dropping
    } else {
      toast({
        variant: "destructive",
        title: "Selecciona un destino",
        description: "Toca una casilla de comida en el planificador antes de añadir una receta.",
      });
    }
  };

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);

  const handleInternalSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
      await handleSaveRecipe(recipeData, imageFile, isGlobal, existingId);
      handleDialogClose();
  };

  const handleInternalDeleteRecipe = (recipeId: string, isGlobal: boolean) => {
    handleDeleteRecipe(recipeId, isGlobal);
    // Also remove from the week plan
    currentWeekPlan.forEach(dayPlan => {
        dayPlan.meals.forEach(meal => {
            meal.recipes.forEach(recipeInMeal => {
                if (recipeInMeal.id === recipeId) {
                    handleRemoveRecipeFromMeal(dayPlan.day, meal.id, recipeInMeal.instanceId);
                }
            });
        });
    });
    handleDialogClose();
  };
  
  const handleExitGuest = () => {
    router.push('/');
  };

  const dailyTotals = useMemo(() => {
    if (!currentWeekPlan) return [];
    return currentWeekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      if (Array.isArray(dayPlan.meals)) {
        dayPlan.meals.forEach(meal => {
          meal.recipes.forEach(recipe => {
            totals.calories += recipe.calories;
            totals.protein += recipe.protein;
            totals.carbs += recipe.carbs;
            totals.fat += recipe.fat;
          });
        });
      }
      return { day: dayPlan.day, totals };
    });
  }, [currentWeekPlan]);
  
  const handlePanelOpen = (panel: 'goals' | 'shopping-list' | 'sticky-note') => {
    setActivePanel(activePanel === panel ? null : panel);
  }
  
  const handlePanelChange = (panel: 'goals' | 'shopping-list' | 'sticky-note', isOpen: boolean) => {
    setActivePanel(isOpen ? panel : null);
  }

  const handleAiRecipeGenerated = (recipe: Omit<Recipe, 'id'>) => {
    setDialogState({
      open: true,
      mode: 'create',
      recipe: recipe as Recipe, // Treat it as a full recipe for pre-filling
    });
  };

  const doNothing = () => {};

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
        <div className="w-full">
          <MealPlanner
            weekPlan={currentWeekPlan}
            dailyTotals={dailyTotals}
            activeGoal={activeGoalMacros}
            onDrop={handleDrop}
            onClearMeal={handleClearMeal}
            onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
            onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
            onUpdateMealTitle={isGuestMode ? doNothing : handleUpdateMealTitle}
            onAddMeal={isGuestMode ? doNothing : handleAddMeal}
            onDeleteMeal={isGuestMode ? doNothing : handleDeleteMeal}
            activeDropTarget={activeDropTarget}
            onSetDropTarget={setActiveDropTarget}
          />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <RecipeLibrary 
            userRecipes={currentUserRecipes}
            nutriplannerRecipes={nutriplannerRecipes}
            folders={currentFolders}
            globalFolders={[]} // This should be populated if admin features are built out
            onRecipeAction={handleRecipeAction}
            onCopyRecipe={handleCopyRecipe}
            onAddToPlan={handleAddToPlan}
            onFolderCreate={isGuestMode ? doNothing : handleFolderCreate}
            onFolderUpdate={isGuestMode ? doNothing : handleFolderUpdate}
            onFolderDelete={isGuestMode ? doNothing : handleFolderDelete}
            onAssignRecipeToFolder={isGuestMode ? doNothing : handleAssignRecipeToFolder}
            onGlobalFolderCreate={doNothing}
            onGlobalFolderUpdate={doNothing}
            onGlobalFolderDelete={doNothing}
            onAssignRecipeToGlobalFolder={doNothing}
            onAiRecipeGenerated={handleAiRecipeGenerated}
          />
        </div>
      </div>
      <RecipeDialog
        dialogState={dialogState}
        isSaving={isSaving}
        folders={currentFolders}
        globalFolders={[]}
        onClose={handleDialogClose}
        onSave={handleInternalSaveRecipe}
        onDelete={handleInternalDeleteRecipe}
        onEdit={(recipe, isGlobal) => handleRecipeAction('edit', recipe, isGlobal)}
        onCopy={handleCopyRecipe}
      />
      
      <FloatingMenu onPanelOpen={handlePanelOpen} />

      <ShoppingListSheet
        weekPlan={currentWeekPlan}
        isOpen={activePanel === 'shopping-list'}
        onOpenChange={(isOpen) => handlePanelChange('shopping-list', isOpen)}
        currentShoppingList={currentShoppingList}
        onListChange={handleShoppingListUpdate}
      />
      <FloatingGoals
        calorieResult={currentCalorieResult}
        onCalorieResultSave={handleCalorieResultSave}
        isOpen={activePanel === 'goals'}
        onOpenChange={(isOpen) => handlePanelChange('goals', isOpen)}
        onGoalSelect={handleActiveGoalChange}
        onSaveCustomGoal={handleSaveCustomGoal}
        activeGoal={activeGoal}
      />
      <StickyNote
        initialContent={currentStickyNote}
        onSave={handleNoteSave}
        isOpen={activePanel === 'sticky-note'}
        onOpenChange={(isOpen) => handlePanelChange('sticky-note', isOpen)}
      />

      <AlertDialog open={isGuestPromptOpen} onOpenChange={setIsGuestPromptOpen}>
      <AlertDialogContent className="bg-glass">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quieres guardar tus cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás en modo invitado. Para guardar tus recetas y planes de comidas, necesitas iniciar sesión.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsGuestPromptOpen(false)}>Seguir como invitado</AlertDialogCancel>
          <AlertDialogAction onClick={handleExitGuest}>
            Ir a la página de registro
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  );
}
