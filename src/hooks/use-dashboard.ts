'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe, DialogState, ActiveDropTarget, Meal, PanelType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useUser } from '@/firebase';
import { autocompleteWeek } from '@/ai/flows/autocomplete-flow';
import { getAiErrorMessage } from '@/lib/ai-error';
import type { AutocompletePreferences } from '@/components/nutri-planner/autocomplete-preferences-dialog';

export function useDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) router.replace('/');
  }, [userLoading, user, router]);

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
    handleClearDay,
    handleClearWeek,
    handleRemoveRecipeFromMeal,
    handleUpdateMealTitle,
    handleAddMeal,
    handleDeleteMeal,
    handleUpdateServingsEaten,
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

  // UI state
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<ActiveDropTarget | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [selectedMealForAddition, setSelectedMealForAddition] = useState<Meal | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);

  // Handlers
  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe = false) => {
    setDialogState({ open: true, mode: action, recipe: recipe || undefined, isNutriPlannerRecipe } as DialogState);
  }, []);

  const handleDialogClose = useCallback(() => setDialogState({ open: false }), []);

  const handleAddToPlan = (recipe: Recipe) => {
    if (activeDropTarget) {
      handleDrop(activeDropTarget.day, activeDropTarget.mealId, recipe);
      setActiveDropTarget(null);
    } else {
      toast({
        variant: 'destructive',
        title: 'Selecciona un destino',
        description: 'Toca una casilla de comida en el planificador antes de añadir una receta.',
      });
    }
  };

  const handleInternalSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    try {
      await handleSaveRecipe(recipeData, imageFile, isGlobal, existingId);
      handleDialogClose();
    } catch {
      // Save failed (a toast was already shown). Keep the dialog open so the
      // user doesn't lose their input and can retry.
    }
  };

  const handleInternalDeleteRecipe = (recipeId: string, isGlobal: boolean) => {
    handleDeleteRecipe(recipeId, isGlobal);
    currentWeekPlan.forEach(dayPlan =>
      dayPlan.meals.forEach(meal =>
        meal.recipes.forEach(r => {
          if (r.id === recipeId) handleRemoveRecipeFromMeal(dayPlan.day, meal.id, r.instanceId);
        })
      )
    );
    handleDialogClose();
  };

  const handleMealSlotClick = (day: string, meal: Meal) => {
    setActiveDropTarget({ day, mealId: meal.id });
    setSelectedMealForAddition(meal);
    setIsRecipeSelectorOpen(true);
  };

  const handleRecipeSelectionSave = (selectedRecipes: Recipe[]) => {
    if (!selectedMealForAddition || !activeDropTarget) return;
    selectedRecipes.forEach(recipe => handleDrop(activeDropTarget.day, selectedMealForAddition.id, recipe));
    setIsRecipeSelectorOpen(false);
    setSelectedMealForAddition(null);
  };

  const handlePanelOpen = (panel: PanelType) => setActivePanel(prev => prev === panel ? null : panel);
  const handlePanelChange = (panel: PanelType, isOpen: boolean) => setActivePanel(isOpen ? panel : null);

  const handleAiRecipeGenerated = (recipe: Omit<Recipe, 'id'>) => {
    setDialogState({ open: true, mode: 'create', recipe: recipe as Recipe });
  };

  const handleAutocompleteWeek = () => setIsPreferencesDialogOpen(true);

  const handleRunAutocomplete = async (preferences: AutocompletePreferences) => {
    setIsPreferencesDialogOpen(false);
    try {
      setIsAutocompleting(true);
      const availableRecipes = [...currentUserRecipes, ...nutriplannerRecipes];
      const placements = await autocompleteWeek({
        weekPlan: currentWeekPlan,
        availableRecipes,
        activeGoal: activeGoalMacros || null,
        preferences,
      });
      if (placements && Array.isArray(placements)) {
        placements.forEach(p => {
          const recipe = availableRecipes.find(r => r.id === p.recipeId);
          if (recipe) handleDrop(p.day, p.mealId, recipe);
        });
        toast({ title: 'Semana autocompletada', description: 'Se han rellenado los huecos vacíos de tu planificador.' });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error al autocompletar', description: getAiErrorMessage(e, 'No se pudo generar el plan semanal completo.') });
    } finally {
      setIsAutocompleting(false);
    }
  };

  const dailyTotals = useMemo(() => {
    if (!currentWeekPlan) return [];
    return currentWeekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      if (Array.isArray(dayPlan.meals)) {
        dayPlan.meals.forEach(meal =>
          meal.recipes.forEach(recipe => {
            const scale = (recipe.servingsEaten ?? 1) / (recipe.servings ?? 1);
            totals.calories += recipe.calories * scale;
            totals.protein += recipe.protein * scale;
            totals.carbs += recipe.carbs * scale;
            totals.fat += recipe.fat * scale;
          })
        );
      }
      return { day: dayPlan.day, totals };
    });
  }, [currentWeekPlan]);

  return {
    // Recipe state
    currentUserRecipes, nutriplannerRecipes, currentFolders, globalFolders, isSaving,
    handleSaveRecipe, handleDeleteRecipe, handleCopyRecipe,
    handleFolderCreate, handleFolderDelete, handleFolderUpdate, handleAssignRecipeToFolder,
    handleGlobalFolderCreate, handleGlobalFolderDelete, handleGlobalFolderUpdate, handleAssignRecipeToGlobalFolder,
    // Week plan state
    currentWeekPlan, dailyTotals,
    handleDrop, handleClearMeal, handleClearDay, handleClearWeek, handleRemoveRecipeFromMeal,
    handleUpdateMealTitle, handleAddMeal, handleDeleteMeal, handleUpdateServingsEaten,
    // User profile state
    currentStickyNote, currentCalorieResult, activeGoalMacros, currentShoppingList, activeGoal,
    handleNoteSave, handleCalorieResultSave, handleActiveGoalChange, handleSaveCustomGoal, handleShoppingListUpdate,
    // UI state
    dialogState, activePanel, activeDropTarget, setActiveDropTarget,
    isRecipeSelectorOpen, setIsRecipeSelectorOpen, selectedMealForAddition,
    isAutocompleting, isPreferencesDialogOpen, setIsPreferencesDialogOpen,
    // Handlers
    handleRecipeAction, handleDialogClose, handleAddToPlan,
    handleInternalSaveRecipe, handleInternalDeleteRecipe,
    handleMealSlotClick, handleRecipeSelectionSave,
    handlePanelOpen, handlePanelChange,
    handleAiRecipeGenerated, handleAutocompleteWeek, handleRunAutocomplete,
  };
}
