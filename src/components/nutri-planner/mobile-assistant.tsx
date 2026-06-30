'use client';

import { useState, useCallback } from 'react';
import { AssistantDialog } from '@/components/nutri-planner/assistant-dialog';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { autocompleteWeek } from '@/ai/flows/autocomplete-flow';
import { getAiErrorMessage } from '@/lib/ai-error';
import { useToast } from '@/hooks/use-toast';
import { useAiQuota } from '@/hooks/use-ai-quota';
import type { Recipe, AiIngredientEstimate } from '@/lib/types';
import type { useRecipeState } from '@/hooks/use-recipe-state';
import type { useWeekPlanState } from '@/hooks/use-week-plan-state';
import type { useUserProfileState } from '@/hooks/use-user-profile-state';

interface MobileAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  recipeState: ReturnType<typeof useRecipeState>;
  weekPlanState: ReturnType<typeof useWeekPlanState>;
  profileState: ReturnType<typeof useUserProfileState>;
  /** When provided, opening autocomplete shows the preferences dialog instead of running with defaults. */
  onOpenAutocomplete?: () => void;
  /** Start listening as soon as the assistant opens (one-tap-to-talk). */
  autoListen?: boolean;
}

/**
 * Shared mobile assistant: mounts the voice/chat AssistantDialog wired to the
 * full set of plan actions, plus the review dialog for AI-generated recipes.
 * Used by both the planner and the recipes tab so the wiring lives in one place.
 */
export function MobileAssistant({
  isOpen,
  onClose,
  recipeState,
  weekPlanState,
  profileState,
  onOpenAutocomplete,
  autoListen,
}: MobileAssistantProps) {
  const { toast } = useToast();
  const { check: checkAiQuota } = useAiQuota();
  const [aiRecipeDialog, setAiRecipeDialog] = useState<DialogState>({ open: false });

  const handleAiRecipeGenerated = useCallback((recipe: Omit<Recipe, 'id'>, aiIngredients?: AiIngredientEstimate[]) => {
    setAiRecipeDialog({ open: true, mode: 'create', recipe: recipe as Recipe, aiIngredients });
  }, []);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    await recipeState.handleSaveRecipe(recipeData, imageFile, isGlobal, existingId);
    setAiRecipeDialog({ open: false });
  };

  // If the parent provides `onOpenAutocomplete`, delegate to the preferences
  // dialog (same flow as the "Autocompletar" chip). Otherwise fall back to
  // running the flow immediately with sensible defaults (e.g. recipes tab).
  const handleAutocomplete = useCallback(async () => {
    if (onOpenAutocomplete) {
      onOpenAutocomplete();
      return;
    }
    const quota = await checkAiQuota();
    if (!quota.allowed) {
      toast({ title: 'Límite de IA', description: quota.message ?? 'Has alcanzado el límite de peticiones de IA por hoy.' });
      return;
    }
    try {
      const availableRecipes = [...recipeState.currentUserRecipes, ...recipeState.nutriplannerRecipes];
      const placements = await autocompleteWeek({
        weekPlan: weekPlanState.currentWeekPlan,
        availableRecipes,
        activeGoal: profileState.activeGoalMacros || null,
        preferences: {
          allowRepetition: 'max_twice',
          priority: profileState.activeGoalMacros ? 'goal' : 'protein',
          dietaryRestrictions: '',
          goalMarginPercent: 15,
          diet: profileState.currentDietPreference,
        },
      });
      if (Array.isArray(placements)) {
        placements.forEach(p => {
          const recipe = availableRecipes.find(r => r.id === p.recipeId);
          if (recipe) weekPlanState.handleDrop(p.day, p.mealId, recipe, p.servings);
        });
        toast({ title: 'Semana autocompletada', description: 'Se han rellenado los huecos vacíos de tu planificador.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al autocompletar', description: getAiErrorMessage(e, 'No se pudo generar el plan semanal.') });
    }
  }, [onOpenAutocomplete, recipeState.currentUserRecipes, recipeState.nutriplannerRecipes, weekPlanState, profileState, toast, checkAiQuota]);

  return (
    <>
      <AssistantDialog
        isOpen={isOpen}
        onClose={onClose}
        autoListen={autoListen}
        weekPlan={weekPlanState.currentWeekPlan}
        userRecipes={recipeState.currentUserRecipes}
        nutriplannerRecipes={recipeState.nutriplannerRecipes}
        activeGoalMacros={profileState.activeGoalMacros || null}
        dietPreference={profileState.currentDietPreference}
        onDrop={weekPlanState.handleDrop}
        onClearMeal={weekPlanState.handleClearMeal}
        onClearDay={weekPlanState.handleClearDay}
        onClearWeek={weekPlanState.handleClearWeek}
        onAutocomplete={handleAutocomplete}
        onSetGoal={profileState.handleActiveGoalChange}
        onCreateRecipe={handleAiRecipeGenerated}
      />
      <RecipeDialog
        dialogState={aiRecipeDialog}
        isSaving={recipeState.isSaving}
        onClose={() => setAiRecipeDialog({ open: false })}
        onSave={handleSaveRecipe}
        onDelete={recipeState.handleDeleteRecipe}
        onEdit={(recipe, isGlobal) => setAiRecipeDialog({ open: true, mode: 'edit', recipe, isNutriPlannerRecipe: isGlobal })}
        onCopy={recipeState.handleCopyRecipe}
        isMobile
      />
    </>
  );
}
