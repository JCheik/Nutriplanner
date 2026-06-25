'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import type { DayPlan, Meal, Recipe, RecipeInstance, GoalMacros, DietTag } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { ChevronLeft, ChevronRight, X, Plus, Minus, Flame, UtensilsCrossed, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { useRecipeState } from '@/hooks/use-recipe-state';
import type { useWeekPlanState } from '@/hooks/use-week-plan-state';

type CombinedState = ReturnType<typeof useRecipeState> & ReturnType<typeof useWeekPlanState>;

interface MobilePageContentProps extends CombinedState {
  activeGoalMacros: GoalMacros | null;
  dietPreference?: DietTag[];
  onAssistantOpen: () => void;
}

// Colour a macro total by how close it is to its goal (green near target,
// orange drifting, red far). Mirrors the desktop "today" summary.
function macroColor(current: number, target: number | undefined): string {
  if (!target) return 'text-foreground';
  const ratio = current / target;
  if (ratio >= 0.9 && ratio <= 1.1) return 'text-green-600 dark:text-green-500';
  if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) return 'text-orange-500 dark:text-orange-400';
  return 'text-destructive';
}

// "Hoy" / "Mañana" / "Ayer" for nearby days; empty otherwise (the weekday name
// is shown instead).
function relativeDayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return '';
}

export function MobilePageContent({
  currentUserRecipes,
  nutriplannerRecipes,
  currentWeekPlan,
  handleDrop,
  handleRemoveRecipeFromMeal,
  handleUpdateServingsEaten,
  handleAddMeal,
  activeGoalMacros,
  dietPreference = [],
  onAssistantOpen,
}: MobilePageContentProps) {

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });

  const touchStartX = useRef<number | null>(null);

  const activeDayName = useMemo(() => {
    const dayMap: DayPlan['day'][] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayMap[currentDate.getDay()];
  }, [currentDate]);

  const activeDayPlan = useMemo(() => {
    if (!currentWeekPlan) return null;
    return currentWeekPlan.find(d => d.day === activeDayName) || null;
  }, [currentWeekPlan, activeDayName]);

  const dayMeals = useMemo(() => activeDayPlan?.meals ?? [], [activeDayPlan]);

  // Daily totals, scaled by the servings actually eaten (same as desktop).
  const totals = useMemo(() => {
    return dayMeals.reduce(
      (acc, meal) => {
        meal.recipes.forEach(r => {
          const scale = (r.servingsEaten ?? 1) / (r.servings ?? 1);
          acc.calories += r.calories * scale;
          acc.protein += r.protein * scale;
          acc.carbs += r.carbs * scale;
          acc.fat += r.fat * scale;
        });
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [dayMeals]);

  const handleDateChange = (direction: -1 | 1) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction);
      return newDate;
    });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 50) handleDateChange(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setDialogState({ open: true, mode: 'view', recipe });
  };

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsRecipeSelectorOpen(true);
  };

  const handleRecipeSelectionSave = (updatedRecipes: Recipe[]) => {
    if (!selectedMeal || !activeDayName) return;
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
  const weekdayLabel = formattedDate.split(',')[0];
  const dateLabel = formattedDate.split(',')[1];
  const relLabel = relativeDayLabel(currentDate);

  return (
    <>
      <div className="p-4 pb-24" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Day navigation */}
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="icon" onClick={() => handleDateChange(-1)} aria-label="Día anterior">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold font-headline capitalize leading-tight">
              {relLabel || weekdayLabel}
            </h1>
            <p className="text-sm text-muted-foreground capitalize">
              {relLabel ? weekdayLabel + ',' : ''}{dateLabel}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDateChange(1)} aria-label="Día siguiente">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Daily summary vs goal */}
        {dayMeals.some(m => m.recipes.length > 0) && (
          <div className="mb-5 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="h-5 w-5 text-primary" />
              <span className={cn('font-bold text-xl', macroColor(totals.calories, activeGoalMacros?.calories))}>
                {Math.round(totals.calories)}
              </span>
              <span className="text-muted-foreground text-sm">
                / {activeGoalMacros ? Math.round(activeGoalMacros.calories) : '—'} kcal
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="flex flex-col">
                <span className={cn('font-bold', macroColor(totals.protein, activeGoalMacros?.protein))}>{Math.round(totals.protein)}g</span>
                <span className="text-muted-foreground">Prot.</span>
              </div>
              <div className="flex flex-col">
                <span className={cn('font-bold', macroColor(totals.carbs, activeGoalMacros?.carbs))}>{Math.round(totals.carbs)}g</span>
                <span className="text-muted-foreground">Carbs</span>
              </div>
              <div className="flex flex-col">
                <span className={cn('font-bold', macroColor(totals.fat, activeGoalMacros?.fat))}>{Math.round(totals.fat)}g</span>
                <span className="text-muted-foreground">Grasa</span>
              </div>
            </div>
          </div>
        )}

        {/* Meals */}
        <div className="space-y-4">
          {dayMeals.length > 0 ? (
            dayMeals.map((meal: Meal) => (
              <div key={meal.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <h2 className="font-semibold uppercase text-xs tracking-wider text-muted-foreground">{meal.title}</h2>
                </div>
                <div className="px-3 pb-3 space-y-2">
                  {meal.recipes.length > 0 ? (
                    meal.recipes.map((recipe: RecipeInstance) => {
                      const servingsEaten = recipe.servingsEaten ?? 1;
                      const totalServings = recipe.servings ?? 1;
                      const kcal = Math.round(recipe.calories * (servingsEaten / totalServings));
                      return (
                        <div key={recipe.instanceId} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                          <button
                            className="flex-1 min-w-0 text-left"
                            onClick={() => handleRecipeClick(recipe)}
                          >
                            <p className="font-medium text-sm leading-tight line-clamp-2">{recipe.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{servingsEaten} rac · {kcal} kcal</p>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20"
                              aria-label="Quitar una ración"
                              onClick={() => handleUpdateServingsEaten(activeDayName, meal.id, recipe.instanceId, Math.max(1, servingsEaten - 1))}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20"
                              aria-label="Añadir una ración"
                              onClick={() => handleUpdateServingsEaten(activeDayName, meal.id, recipe.instanceId, servingsEaten + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              aria-label="Eliminar receta"
                              onClick={() => handleRemoveRecipeFromMeal(activeDayName, meal.id, recipe.instanceId)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : null}
                  <button
                    onClick={() => handleMealClick(meal)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Añadir receta
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-xl">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-semibold">No hay comidas en este día</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Crea una comida para empezar a planificar.</p>
              <Button onClick={() => handleAddMeal(activeDayName, 0)}>
                <Plus className="mr-2 h-4 w-4" /> Añadir comida
              </Button>
            </div>
          )}

          {dayMeals.length > 0 && (
            <button
              onClick={() => handleAddMeal(activeDayName, dayMeals.length)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" /> Añadir comida
            </button>
          )}
        </div>
      </div>

      {/* Voice assistant FAB — the primary way to change meals hands-free
          (kitchen / supermarket). Sits above the bottom nav. */}
      <button
        onClick={onAssistantOpen}
        aria-label="Hablar con el asistente"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Mic className="h-6 w-6" />
      </button>

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
          dietPreference={dietPreference}
        />
      )}
    </>
  );
}
