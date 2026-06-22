'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe, DialogState, ActiveDropTarget, Meal } from '@/lib/types';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { StickyNote } from '@/components/nutri-planner/sticky-note';
import { FloatingGoals } from '@/components/nutri-planner/floating-goals';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { FloatingMenu } from '@/components/nutri-planner/floating-menu';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useUser } from '@/firebase';
import { RecipeChatDialog } from '@/components/nutri-planner/recipe-chat-dialog';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { EmptyFridgeScanner } from '@/components/nutri-planner/empty-fridge-scanner';
import { OnboardingTour } from '@/components/nutri-planner/onboarding-tour';
import { autocompleteWeekFlow } from '@/ai/flows/autocomplete-flow';


export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  
  useEffect(() => {
    // This effect runs only on the client after hydration
    if (!userLoading && !user) {
      router.replace('/');
    }
  }, [userLoading, user, router]);


  // --- Decomposed State Hooks ---
  const recipeState = useRecipeState();
  const weekPlanState = useWeekPlanState();
  const userProfileState = useUserProfileState();

  const {
    currentUserRecipes,
    nutriplannerRecipes,
    currentFolders,
    globalFolders,
    isSaving,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
    handleFolderCreate,
    handleFolderDelete,
    handleFolderUpdate,
    handleAssignRecipeToFolder,
    handleGlobalFolderCreate,
    handleGlobalFolderDelete,
    handleGlobalFolderUpdate,
    handleAssignRecipeToGlobalFolder,
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
  const [activePanel, setActivePanel] = useState<'goals' | 'shopping-list' | 'sticky-note' | 'ai-chat' | 'empty-fridge' | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<ActiveDropTarget | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [selectedMealForAddition, setSelectedMealForAddition] = useState<Meal | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);


  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe || undefined,
      isNutriPlannerRecipe,
    } as DialogState);
  }, []);
  
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

  const handleMealSlotClick = (day: string, meal: Meal) => {
      setActiveDropTarget({ day: day, mealId: meal.id });
      setSelectedMealForAddition(meal);
      setIsRecipeSelectorOpen(true);
  };

  const handleRecipeSelectionSave = (selectedRecipes: Recipe[]) => {
    if (!selectedMealForAddition || !activeDropTarget) return;

    selectedRecipes.forEach(recipe => {
        handleDrop(activeDropTarget.day, selectedMealForAddition.id, recipe);
    });

    setIsRecipeSelectorOpen(false);
    setSelectedMealForAddition(null);
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
  
  const handlePanelOpen = (panel: 'goals' | 'shopping-list' | 'sticky-note' | 'ai-chat' | 'empty-fridge') => {
    setActivePanel(activePanel === panel ? null : panel);
  }
  
  const handlePanelChange = (panel: 'goals' | 'shopping-list' | 'sticky-note' | 'ai-chat' | 'empty-fridge', isOpen: boolean) => {
    setActivePanel(isOpen ? panel : null);
  }

  const handleAiRecipeGenerated = (recipe: Omit<Recipe, 'id'>) => {
    setDialogState({
      open: true,
      mode: 'create',
      recipe: recipe as Recipe, // Treat it as a full recipe for pre-filling
    });
  };

  const handleAutocompleteWeek = async () => {
    try {
      setIsAutocompleting(true);
      const availableRecipes = [...currentUserRecipes, ...nutriplannerRecipes];
      
      const placements = await autocompleteWeekFlow({
        weekPlan: currentWeekPlan,
        availableRecipes,
        activeGoal: activeGoalMacros || null,
      });

      if (placements && Array.isArray(placements)) {
        placements.forEach(p => {
           const recipe = availableRecipes.find(r => r.id === p.recipeId);
           if (recipe) {
              handleDrop(p.day, p.mealId, recipe);
           }
        });
        toast({
          title: "Semana autocompletada",
          description: "Se han rellenado los huecos vacíos de tu planificador.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error al autocompletar",
        description: "No se pudo generar el plan semanal completo.",
      });
    } finally {
      setIsAutocompleting(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
        <div className="w-full" data-tour="meal-planner">
          <MealPlanner
            weekPlan={currentWeekPlan}
            dailyTotals={dailyTotals}
            activeGoal={activeGoalMacros || null}
            onDrop={handleDrop}
            onClearMeal={handleClearMeal}
            onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
            onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
            onUpdateMealTitle={handleUpdateMealTitle}
            onAddMeal={handleAddMeal}
            onDeleteMeal={handleDeleteMeal}
            activeDropTarget={activeDropTarget}
            onSetDropTarget={setActiveDropTarget}
            onMealSlotClick={handleMealSlotClick}
            onAutocomplete={handleAutocompleteWeek}
            isAutocompleting={isAutocompleting}
          />
        </div>
        <div className="grid grid-cols-1 gap-6" data-tour="recipe-library">
          <RecipeLibrary 
            userRecipes={currentUserRecipes}
            nutriplannerRecipes={nutriplannerRecipes}
            folders={currentFolders}
            globalFolders={globalFolders}
            onRecipeAction={handleRecipeAction}
            onCopyRecipe={handleCopyRecipe}
            onAddToPlan={handleAddToPlan}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFolderDelete={handleFolderDelete}
            onAssignRecipeToFolder={handleAssignRecipeToFolder}
            onGlobalFolderCreate={handleGlobalFolderCreate}
            onGlobalFolderUpdate={handleGlobalFolderUpdate}
            onGlobalFolderDelete={handleGlobalFolderDelete}
            onAssignRecipeToGlobalFolder={handleAssignRecipeToGlobalFolder}
            onAiRecipeGenerated={handleAiRecipeGenerated}
            onAiChatOpen={() => handlePanelOpen('ai-chat')}
            onEmptyFridgeOpen={() => handlePanelOpen('empty-fridge')}
          />
        </div>
      </div>
      <RecipeDialog
        dialogState={dialogState}
        isSaving={isSaving}
        folders={currentFolders}
        globalFolders={globalFolders}
        onClose={handleDialogClose}
        onSave={handleInternalSaveRecipe}
        onDelete={handleInternalDeleteRecipe}
        onEdit={(recipe, isGlobal) => handleRecipeAction('edit', recipe, isGlobal)}
        onCopy={handleCopyRecipe}
      />
      
      <FloatingMenu onPanelOpen={handlePanelOpen} />

      <OnboardingTour />
      
      <RecipeChatDialog
        isOpen={activePanel === 'ai-chat'}
        onClose={() => handlePanelChange('ai-chat', false)}
        onRecipeGenerated={handleAiRecipeGenerated}
        nutritionalGoal={activeGoalMacros || null}
      />

      <EmptyFridgeScanner
        isOpen={activePanel === 'empty-fridge'}
        onClose={() => handlePanelChange('empty-fridge', false)}
        onRecipeAction={handleRecipeAction}
        nutritionalGoal={activeGoalMacros || null}
        onSaveRecipe={handleSaveRecipe}
        isSavingRecipe={isSaving}
      />

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
        activeGoal={activeGoal || null}
      />
      <StickyNote
        initialContent={currentStickyNote}
        onSave={handleNoteSave}
        isOpen={activePanel === 'sticky-note'}
        onOpenChange={(isOpen) => handlePanelChange('sticky-note', isOpen)}
      />
      {selectedMealForAddition && (
        <RecipeSelectionDialog
          isOpen={isRecipeSelectorOpen}
          onClose={() => setIsRecipeSelectorOpen(false)}
          meal={selectedMealForAddition}
          allRecipes={[...currentUserRecipes, ...nutriplannerRecipes]}
          onSave={handleRecipeSelectionSave}
        />
      )}
    </div>
  );
}
