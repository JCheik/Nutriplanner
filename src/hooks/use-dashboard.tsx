'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe, DialogState, ActiveDropTarget, Meal, PanelType, AiIngredientEstimate, WeekPlan } from '@/lib/types';
import { findInPlan, splitToRemove } from '@/lib/plan-search';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useWeekHistory } from '@/hooks/use-week-history';
import { useUser } from '@/firebase';
import { autocompleteWeek } from '@/ai/flows/autocomplete-flow';
import { autocompleteToast, type UnfilledSlot } from '@/lib/autocomplete-summary';
import { getAiErrorMessage } from '@/lib/ai-error';
import { useAiQuota } from '@/hooks/use-ai-quota';
import { mealCalorieRatio, suggestedServings } from '@/lib/serving-utils';
import type { AutocompletePreferences } from '@/components/nutri-planner/autocomplete-preferences-dialog';

export function useDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { check: checkAiQuota } = useAiQuota();

  useEffect(() => {
    if (!userLoading && !user) router.replace('/');
  }, [userLoading, user, router]);

  const recipeState = useRecipeState();
  const weekPlanState = useWeekPlanState();
  const userProfileState = useUserProfileState();
  const weekHistory = useWeekHistory();

  const {
    currentUserRecipes,
    nutriplannerRecipes,
    isSaving,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
  } = recipeState;

  const {
    currentWeekPlan,
    handleDrop,
    handleClearMeal,
    handleClearDay,
    handleClearWeek,
    handleRestoreWeek,
    handleRemoveRecipeFromMeal,
    handleUpdateMealTitle,
    handleUpdateMealTypes,
    handleAddMeal,
    handleDeleteMeal,
    handleUpdateServingsEaten,
  } = weekPlanState;

  const {
    currentCalorieResult,
    activeGoalMacros,
    currentShoppingList,
    currentDietPreference,
    nutriInterview,
    activeGoal,
    handleCalorieResultSave,
    handleActiveGoalChange,
    handleSaveCustomGoal,
    handleShoppingListUpdate,
    handleDietPreferenceChange,
    handleNutriInterviewSave,
  } = userProfileState;

  // UI state
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<ActiveDropTarget | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [selectedMealForAddition, setSelectedMealForAddition] = useState<Meal | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  /**
   * Huecos que la última pasada de autocompletado dejó vacíos, con su motivo,
   * para poder señalarlos EN el cuadrante. El aviso se va a los pocos segundos y
   * con él se iba la única pista de qué había pasado y dónde.
   */
  const [unfilledSlots, setUnfilledSlots] = useState<UnfilledSlot[]>([]);
  /** Cerrojo síncrono de `handleRunAutocomplete`. Ver el comentario de allí. */
  const autocompleteLock = useRef(false);

  // Handlers
  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe = false) => {
    setDialogState({ open: true, mode: action, recipe: recipe || undefined, isNutriPlannerRecipe } as DialogState);
  }, []);

  const handleDialogClose = useCallback(() => setDialogState({ open: false }), []);

  const handleAddToPlan = (recipe: Recipe) => {
    if (!activeDropTarget) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un destino',
        description: 'Toca una casilla de comida en el planificador antes de añadir una receta.',
      });
      return;
    }

    const { day, mealId } = activeDropTarget;
    const meal = currentWeekPlan.find(d => d.day === day)?.meals.find(m => m.id === mealId);
    // Mismas raciones que por el diálogo: la porción cubre la parte del objetivo
    // que le toca a esa comida. Antes este camino metía siempre 1 ración, así que
    // la misma receta entraba distinta según por dónde la añadieras.
    const target = activeGoalMacros ? activeGoalMacros.calories * mealCalorieRatio(meal?.mealTypes ?? []) : null;
    handleDrop(day, mealId, recipe, suggestedServings(recipe, target));

    // La casilla SIGUE elegida: lo normal es meter dos o tres cosas seguidas en
    // la misma comida, y deseleccionar obligaba a volver al cuadrante entre una
    // y otra. No es estado escondido — la casilla se queda resaltada.
    toast({
      title: 'Añadida al plan',
      description: `${recipe.name} → ${meal?.title ?? 'comida'} del ${day}. La casilla sigue elegida por si quieres añadir más.`,
    });
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

  /**
   * Clic en la casilla: **solo la elige como destino**, sin abrir nada.
   *
   * Antes el clic hacía los dos trabajos a la vez —elegir destino Y abrir el
   * buscador—, así que para usar "Añadir al plan" desde la biblioteca había que
   * tocar la casilla, cerrar con la X el diálogo que saltaba solo, y entonces ir
   * a la receta. El paso del medio no servía para nada y era el que molestaba.
   * Ahora abrir el buscador es cosa del botón "Añadir" de la propia casilla.
   *
   * Volver a tocar la casilla ya elegida la deselecciona: sin eso no habría
   * forma de deshacer la elección salvo eligiendo otra.
   */
  const handleSelectSlot = (day: string, meal: Meal) => {
    setActiveDropTarget(prev =>
      prev && prev.day === day && prev.mealId === meal.id ? null : { day, mealId: meal.id }
    );
  };

  const handleMealSlotClick = (day: string, meal: Meal) => {
    setActiveDropTarget({ day, mealId: meal.id });
    setSelectedMealForAddition(meal);
    setIsRecipeSelectorOpen(true);
  };

  const handleRecipeSelectionSave = (selectedRecipes: Recipe[]) => {
    if (!selectedMealForAddition || !activeDropTarget) return;
    const target = activeGoalMacros
      ? activeGoalMacros.calories * mealCalorieRatio(selectedMealForAddition.mealTypes ?? [])
      : null;
    selectedRecipes.forEach(recipe =>
      handleDrop(activeDropTarget.day, selectedMealForAddition.id, recipe, suggestedServings(recipe, target))
    );
    setIsRecipeSelectorOpen(false);
    setSelectedMealForAddition(null);
  };

  const handlePanelOpen = (panel: PanelType) => setActivePanel(prev => prev === panel ? null : panel);
  const handlePanelChange = (panel: PanelType, isOpen: boolean) => setActivePanel(isOpen ? panel : null);

  const handleAiRecipeGenerated = (recipe: Omit<Recipe, 'id'>, aiIngredients?: AiIngredientEstimate[]) => {
    setDialogState({ open: true, mode: 'create', recipe: recipe as Recipe, aiIngredients });
  };

  // URL import: open the editor with the recipe and the captured photo (video
  // frame or post image), which uploads when the user saves.
  const handleRecipeImported = (recipe: Omit<Recipe, 'id'>, imageFile?: File) => {
    setDialogState({ open: true, mode: 'create', recipe: recipe as Recipe, imageFile });
  };

  // Con la entrevista de Mi Laboratorio rellena, ya no hace falta preguntar
  // preferencias cada vez: se derivan de ahí y se autocompleta directo. Sin
  // entrevista, en vez del diálogo de preferencias mandamos a rellenarla —
  // así el primer autocompletado ya sale personalizado.
  const handleAutocompleteWeek = () => {
    if (!nutriInterview) {
      toast({
        title: 'Antes de autocompletar…',
        description: 'Cuéntame tus gustos, lo que evitas y tus alergias en Mi Laboratorio — así te haré un plan mucho mejor que uno genérico.',
        action: (
          <ToastAction altText="Ir a Mi Laboratorio" onClick={() => router.push('/dashboard/perfil?tab=entrevista')}>
            Ir a Mi Laboratorio
          </ToastAction>
        ),
      });
      return;
    }
    handleRunAutocomplete({
      allowRepetition: nutriInterview.varietyPreference === 'variedad' ? 'no_repeat' : 'max_n',
      maxRepetitions: nutriInterview.maxRepeatsPerRecipe ?? 3,
      priority: 'goal',
      dietaryRestrictions: '',
      goalMarginPercent: 15,
      recipeSource: 'all',
    });
  };

  const handleRunAutocomplete = async (
    preferences: AutocompletePreferences,
    /**
     * `planOverride` sirve para encadenarlo justo después de quitar comidas:
     * `currentWeekPlan` todavía trae las viejas hasta que Firestore devuelve el
     * cambio. `excludeRecipeIds` evita que el relleno reponga lo que se acaba
     * de quitar.
     */
    opts?: { planOverride?: WeekPlan; excludeRecipeIds?: string[] }
  ) => {
    // Cerrojo SÍNCRONO. `isAutocompleting` es estado: dos clics seguidos en el
    // mismo tick lo ven a false los dos y se lanzaban dos veces (le pasó al
    // usuario). Además el `disabled` del botón no llega a repintarse a tiempo.
    if (autocompleteLock.current) return;
    autocompleteLock.current = true;
    try {
      const quota = await checkAiQuota();
      if (!quota.allowed) {
        toast({ title: 'Límite de IA', description: quota.message ?? 'Has alcanzado el límite de peticiones de IA por hoy.' });
        return;
      }
      setIsAutocompleting(true);
      const { recipeSource, ...flowPreferences } = preferences;
      const availableRecipes = recipeSource === 'mine'
        ? [...currentUserRecipes]
        : [...currentUserRecipes, ...nutriplannerRecipes];
      // Anti-monotony context: recipe names from the 2 most recent saved weeks,
      // so the AI doesn't rebuild the exact same plan every time.
      const recentRecipeNames = [...new Set(
        weekHistory.history.slice(0, 2).flatMap(snapshot =>
          snapshot.days.flatMap(d => d.meals.flatMap(m => m.recipes.map(r => r.name)))
        )
      )];
      const { placements, unfilled } = await autocompleteWeek({
        weekPlan: opts?.planOverride ?? currentWeekPlan,
        availableRecipes,
        activeGoal: activeGoalMacros || null,
        preferences: {
          ...flowPreferences,
          diet: currentDietPreference,
          ...(nutriInterview ? {
            interview: {
              favoriteFoods: nutriInterview.favoriteFoods,
              avoidFoods: nutriInterview.avoidFoods,
              allergies: nutriInterview.allergies,
              weeklyWishes: nutriInterview.weeklyWishes,
              varietyPreference: nutriInterview.varietyPreference,
              quickWeekdays: nutriInterview.quickWeekdays,
              ...(nutriInterview.freeMealsPerWeek ? { freeMealsPerWeek: nutriInterview.freeMealsPerWeek } : {}),
            },
          } : {}),
          ...(recentRecipeNames.length > 0 ? { recentRecipeNames } : {}),
          ...(opts?.excludeRecipeIds?.length ? { excludeRecipeIds: opts.excludeRecipeIds } : {}),
        },
      });
      placements.forEach(p => {
        const recipe = availableRecipes.find(r => r.id === p.recipeId);
        if (recipe) handleDrop(p.day, p.mealId, recipe, p.servings);
      });
      setUnfilledSlots(unfilled);
      const resultToast = autocompleteToast(placements.length, unfilled);
      // Flexibility reminder: the plan is a guide, not a contract. Swap the
      // planned recipe on free-meal days, guilt-free.
      const freeMeals = nutriInterview?.freeMealsPerWeek ?? 0;
      if (freeMeals > 0 && placements.length > 0 && !resultToast.variant) {
        resultToast.description += ` Recuerda: tienes ${freeMeals} comida${freeMeals > 1 ? 's' : ''} libre${freeMeals > 1 ? 's' : ''} esta semana — el día que toque, sustituye o borra esa receta sin remordimientos.`;
      }
      toast(resultToast);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error al autocompletar', description: getAiErrorMessage(e, 'No se pudo generar el plan semanal completo.') });
    } finally {
      autocompleteLock.current = false;
      setIsAutocompleting(false);
    }
  };

  /**
   * "No quiero tanto atún": quita del plan las comidas que lo lleven y rellena
   * los huecos con otra cosa, de una. Devuelve los números para que el
   * asistente pueda contarlo sin volver a buscar.
   */
  const handleSwapOutOfPlan = (query: string, keepAtMost: number) => {
    const matches = findInPlan(currentWeekPlan, query);
    const { remove } = splitToRemove(matches, keepAtMost);
    if (remove.length === 0) return { matched: matches.length, removed: 0 };

    remove.forEach(m => handleRemoveRecipeFromMeal(m.day, m.mealId, m.instanceId));

    const removedIds = new Set(remove.map(m => m.instanceId));
    const trimmed: WeekPlan = currentWeekPlan.map(d => ({
      ...d,
      meals: d.meals.map(m => ({ ...m, recipes: m.recipes.filter(r => !removedIds.has(r.instanceId)) })),
    }));

    void handleRunAutocomplete(
      {
        allowRepetition: nutriInterview?.varietyPreference === 'variedad' ? 'no_repeat' : 'max_n',
        maxRepetitions: nutriInterview?.maxRepeatsPerRecipe ?? 3,
        priority: 'goal',
        dietaryRestrictions: '',
        goalMarginPercent: 15,
        recipeSource: 'all',
      },
      { planOverride: trimmed, excludeRecipeIds: [...new Set(remove.map(m => m.recipeId))] }
    );
    return { matched: matches.length, removed: remove.length };
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
    currentUserRecipes, nutriplannerRecipes, isSaving,
    handleSaveRecipe, handleDeleteRecipe, handleCopyRecipe,
    // Week plan state
    currentWeekPlan, dailyTotals,
    handleDrop, handleClearMeal, handleClearDay, handleClearWeek, handleRestoreWeek, handleRemoveRecipeFromMeal,
    handleUpdateMealTitle, handleUpdateMealTypes, handleAddMeal, handleDeleteMeal, handleUpdateServingsEaten,
    // Week history
    weekHistory,
    // User profile state
    currentCalorieResult, activeGoalMacros, currentShoppingList, currentDietPreference, nutriInterview, activeGoal,
    handleCalorieResultSave, handleActiveGoalChange, handleSaveCustomGoal, handleShoppingListUpdate, handleDietPreferenceChange, handleNutriInterviewSave,
    // UI state
    dialogState, activePanel, activeDropTarget, setActiveDropTarget,
    isRecipeSelectorOpen, setIsRecipeSelectorOpen, selectedMealForAddition,
    isAutocompleting, unfilledSlots,
    // Handlers
    handleRecipeAction, handleDialogClose, handleAddToPlan,
    handleInternalSaveRecipe, handleInternalDeleteRecipe,
    handleMealSlotClick, handleSelectSlot, handleRecipeSelectionSave,
    handlePanelOpen, handlePanelChange,
    handleAiRecipeGenerated, handleRecipeImported, handleAutocompleteWeek, handleRunAutocomplete,
    handleSwapOutOfPlan,
  };
}
