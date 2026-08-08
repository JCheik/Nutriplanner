'use client';

import React, { useState, useRef, type DragEvent, type KeyboardEvent } from 'react';
import html2canvas from 'html2canvas';
import type { WeekPlan, Recipe, DailyTotal, Macros, GoalMacros, Meal, ActiveDropTarget, RecipeInstance, MealCategory } from '@/lib/types';
import { MEAL_CATEGORIES } from '@/lib/constants';
import { clampServings, mealCalorieRatio, suggestedServings } from '@/lib/serving-utils';

import { ServingsField } from './servings-field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, Plus, Edit, Check, Download, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { dragStore } from '@/lib/drag-store';
import { FeatureHint } from './feature-hint';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  activeGoal: GoalMacros | null;
  onDrop: (day: string, mealId: string, recipe: Recipe, servings?: number) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onClearDay: (day: string) => void;
  onClearWeek: () => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId:string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onUpdateMealTypes: (day: string, mealId: string, mealTypes: MealCategory[]) => void;
  onAddMeal: (day: string, index: number) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
  activeDropTarget: ActiveDropTarget | null;
  onSetDropTarget: (target: ActiveDropTarget | null) => void;
  onMealSlotClick?: (day: string, meal: Meal) => void;
  onAutocomplete?: () => void;
  isAutocompleting?: boolean;
  onUpdateServingsEaten?: (day: string, mealId: string, instanceId: string, servings: number) => void;
}

interface MealSlotProps {
  day: string;
  meal: Meal;
  isEditing: boolean;
  activeGoal: GoalMacros | null;
  onDrop: (day: string, mealId: string, recipe: Recipe, servings?: number) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId: string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onUpdateMealTypes: (day: string, mealId: string, mealTypes: MealCategory[]) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
  isActiveDropTarget: boolean;
  onSetDropTarget: (target: ActiveDropTarget | null) => void;
  onMealSlotClick?: (day: string, meal: Meal) => void;
  onDragEnterSlot?: (day: string, mealId: string) => void;
  onDragLeaveSlot?: () => void;
  isDragOverSlot?: boolean;
  onAutocomplete?: () => void;
  isAutocompleting?: boolean;
  onUpdateServingsEaten?: (day: string, mealId: string, instanceId: string, servings: number) => void;
}

const getMacroColorClass = (current: number, target: number | undefined): string => {
    if (target === undefined || target === 0) return 'text-foreground';
    
    const ratio = current / target;
    if (ratio >= 0.9 && ratio <= 1.1) {
        return 'text-green-600 dark:text-green-500'; // Green for "good" range
    }
    if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) {
        return 'text-orange-500 dark:text-orange-400'; // Orange for "close" range
    }
    if (ratio < 0.75 || ratio > 1.25) {
        return 'text-destructive'; // Red for "far" range
    }
    return 'text-foreground'; // Default color
};

const DailyTotalsRow = ({ totals, previewTotals, goal, className }: { totals: Macros, previewTotals?: Macros | null, goal: GoalMacros | null, className?: string }) => {
  const displayTotals = previewTotals ? {
    calories: totals.calories + previewTotals.calories,
    protein: totals.protein + previewTotals.protein,
    carbs: totals.carbs + previewTotals.carbs,
    fat: totals.fat + previewTotals.fat,
  } : totals;

  return (
  <div className={cn("mt-auto pt-2 border-t", className)}>
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Flame className={cn("h-5 w-5", previewTotals ? "text-primary animate-pulse" : "text-primary")} />
        <span className={cn("font-bold text-lg", getMacroColorClass(displayTotals.calories, goal?.calories))}>
          {Math.round(displayTotals.calories)}
        </span>
        <span className="text-muted-foreground text-sm">kcal</span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1 text-center text-xs mt-1">
      <div className="flex flex-col items-center p-1 rounded-md bg-secondary transition-colors" style={previewTotals ? { backgroundColor: 'var(--primary-foreground)' } : {}}>
        <span className={cn("font-bold", getMacroColorClass(displayTotals.protein, goal?.protein))}>{Math.round(displayTotals.protein)}g</span>
        <span className="text-muted-foreground text-[10px]">Prot.</span>
      </div>
      <div className="flex flex-col items-center p-1 rounded-md bg-secondary transition-colors" style={previewTotals ? { backgroundColor: 'var(--primary-foreground)' } : {}}>
        <span className={cn("font-bold", getMacroColorClass(displayTotals.carbs, goal?.carbs))}>{Math.round(displayTotals.carbs)}g</span>
        <span className="text-muted-foreground text-[10px]">Carbs</span>
      </div>
      <div className="flex flex-col items-center p-1 rounded-md bg-secondary transition-colors" style={previewTotals ? { backgroundColor: 'var(--primary-foreground)' } : {}}>
        <span className={cn("font-bold", getMacroColorClass(displayTotals.fat, goal?.fat))}>{Math.round(displayTotals.fat)}g</span>
        <span className="text-muted-foreground text-[10px]">Grasa</span>
      </div>
    </div>
  </div>
)};


function MealRecipeChip({ recipe, day, mealId, onRecipeClick, onRemove, onUpdateServings }: {
  recipe: RecipeInstance;
  day: string;
  mealId: string;
  onRecipeClick: (r: Recipe) => void;
  onRemove: () => void;
  onUpdateServings: (s: number) => void;
}) {
  const servingsEaten = recipe.servingsEaten ?? 1;
  const totalServings = recipe.servings ?? 1;
  const scale = servingsEaten / totalServings;
  const kcal = Math.round(recipe.calories * scale);

  return (
    // Auto height + stacked (no flex-1 / min-height): each recipe grows to fit
    // its name and controls, so 2+ recipes in one slot never clip or hide a card.
    <div className="w-full relative group/item shrink-0">
      <div
        className="w-full flex flex-col items-center justify-center p-1.5 rounded-md bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer gap-1"
        onClick={(e) => { e.stopPropagation(); onRecipeClick(recipe); }}
      >
        <span className="text-center font-semibold text-secondary-foreground text-xs leading-tight line-clamp-3">
          {recipe.name}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-sm font-bold leading-none"
            onClick={() => onUpdateServings(clampServings(servingsEaten - 1))}
          >−</button>
          <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap flex items-center">
            {/* Escribible para las fracciones; los ± siguen yendo de uno en uno. */}
            <ServingsField
              value={servingsEaten}
              onCommit={onUpdateServings}
              ariaLabel={`Raciones de ${recipe.name}`}
              className="w-7 bg-transparent text-center font-medium outline-none rounded focus:ring-1 focus:ring-ring"
            />
            rac · {kcal} kcal
          </span>
          <button
            className="h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-sm font-bold leading-none"
            onClick={() => onUpdateServings(clampServings(servingsEaten + 1))}
          >+</button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity bg-card/70 hover:bg-card z-10"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function MealSlot({ day, meal, isEditing, activeGoal, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onUpdateMealTypes, onDeleteMeal, isActiveDropTarget, onSetDropTarget, onMealSlotClick, onDragEnterSlot, onDragLeaveSlot, isDragOverSlot, onUpdateServingsEaten }: MealSlotProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(meal.title);

  const handleTitleSave = () => {
    if (tempTitle.trim() && tempTitle !== meal.title) {
      onUpdateMealTitle(day, meal.id, tempTitle);
    }
    setIsEditingTitle(false);
  };
  
  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTempTitle(meal.title);
      setIsEditingTitle(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (onDragEnterSlot) onDragEnterSlot(day, meal.id);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only leave if not entering a child element
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (onDragLeaveSlot) onDragLeaveSlot();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (onDragLeaveSlot) onDragLeaveSlot();
    const recipeData = e.dataTransfer.getData('application/json');
    if (recipeData) {
      const recipe = JSON.parse(recipeData) as Recipe;
      // Pre-fill the portion so it covers this slot's share of the user's goal.
      const target = activeGoal ? activeGoal.calories * mealCalorieRatio(meal.mealTypes ?? []) : null;
      const servings = suggestedServings(recipe, target);
      onDrop(day, meal.id, recipe, servings);
    }
  };

  const handleSlotClick = () => {
    if (onMealSlotClick) {
        onMealSlotClick(day, meal);
    } else {
        onSetDropTarget({ day, mealId: meal.id });
    }
  };

  const hasRecipes = meal.recipes.length > 0;

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop} 
      onClick={handleSlotClick}
      className={cn(
        // No fixed height: the slot GROWS with its recipes. `h-full` used to pin
        // it to the (stretched) column height, so extra recipes overflowed and
        // drew over the next meal's slot. min-height keeps empty slots tidy.
        "relative flex flex-col p-2 bg-background/80 border rounded-xl min-h-[160px]",
        "cursor-pointer transition-colors duration-200",
        isActiveDropTarget && "ring-2 ring-primary",
        isDragOverSlot && "bg-accent/50 border-primary ring-2 ring-primary/50"
      )}
    >
      <div className="flex justify-between items-center mb-1 pl-1 group">
        {isEditingTitle ? (
           <div className="flex-1 flex gap-1 items-center">
             <Input 
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="h-7 text-xs font-medium border-primary bg-input"
            />
           </div>
        ) : (
            <h4
              className={cn("text-xs font-medium text-muted-foreground uppercase tracking-widest", isEditing && 'cursor-pointer hover:underline')}
              onClick={(e) => { e.stopPropagation(); if(isEditing) setIsEditingTitle(true); }}
            >
              {meal.title}
            </h4>
        )}

        <div className={cn("flex items-center transition-opacity", !isEditingTitle && "opacity-0 group-hover:opacity-100")}>
          {isEditing && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}><Edit className="h-3 w-3"/></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDeleteMeal(day, meal.id); }}><X className="h-3 w-3 text-destructive"/></Button>
              </>
            )}
          {!isEditing && hasRecipes && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onClearMeal(day, meal.id); }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isEditing && (() => {
        const selected = meal.mealTypes ?? [];
        const summary = selected.length === 0
          ? 'Tipo de comida'
          : selected.map(v => MEAL_CATEGORIES.find(c => c.value === v)?.label ?? v).join(', ');
        const toggle = (value: MealCategory) => {
          const next = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value];
          onUpdateMealTypes(day, meal.id, next);
        };
        return (
          <div className="px-1 mb-1" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs font-normal px-2">
                  <span className="truncate">{summary}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-glass">
                {MEAL_CATEGORIES.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat.value}
                    checked={selected.includes(cat.value)}
                    onCheckedChange={() => toggle(cat.value)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {cat.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })()}
      <div className={cn(
        "rounded-lg p-1 flex-1 flex flex-col items-center justify-center gap-1 relative group transition-colors",
        hasRecipes || isDragOverSlot ? 'bg-transparent' : 'border-2 border-dashed border-border/50 bg-secondary/30'
      )}>
        {hasRecipes ? (
           <div className="w-full flex flex-col gap-1">
                {meal.recipes.map((recipe: RecipeInstance) => (
                    <MealRecipeChip
                      key={`${recipe.id}-${recipe.instanceId}`}
                      recipe={recipe}
                      day={day}
                      mealId={meal.id}
                      onRecipeClick={(r) => { onRecipeClick(r); }}
                      onRemove={() => onRemoveRecipeFromMeal(day, meal.id, recipe.instanceId)}
                      onUpdateServings={(s) => onUpdateServingsEaten?.(day, meal.id, recipe.instanceId, s)}
                    />
                ))}
            </div>
        ) : !isDragOverSlot && (
          <p className="text-xs text-center text-muted-foreground px-2 pointer-events-none">Arrastra o haz clic para añadir recetas</p>
        )}
        
        {isDragOverSlot && dragStore.getDraggedRecipe() && (
          <div className="w-full h-full flex-1 opacity-50 pointer-events-none animate-pulse">
            <RecipeCard recipe={dragStore.getDraggedRecipe()!} isCompact />
          </div>
        )}
      </div>
    </div>
  );
}

function AddMealButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative h-4 flex items-center justify-center my-1">
      <div className="absolute w-full h-px bg-border/80 border-dashed"></div>
      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded-full bg-background z-10"
        onClick={onClick}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function MealPlanner({ weekPlan, dailyTotals, activeGoal, onDrop, onClearMeal, onClearDay, onClearWeek, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onUpdateMealTypes, onAddMeal, onDeleteMeal, activeDropTarget, onSetDropTarget, onMealSlotClick, onAutocomplete, isAutocompleting, onUpdateServingsEaten }: MealPlannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<{day: string, mealId: string} | null>(null);
  const plannerRef = useRef<HTMLDivElement>(null);
  // Dedicated export layout (see the offscreen block at the bottom). Capturing
  // the live planner produced a messy shot: truncated names, serving steppers
  // and "1 ración · X kcal" controls baked into the image.
  const exportRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!exportRef.current) return;

    const canvas = await html2canvas(exportRef.current, {
      useCORS: true,
      backgroundColor: '#FFFDF9',
      scale: 2, // Increase resolution for better quality
    });
    const link = document.createElement('a');
    link.download = 'plan-semanal-nutrilp.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };


  return (
    <Card className="h-full bg-glass print-shadow-none print-border-none print-bg-transparent">
      <CardHeader className="flex-row items-center justify-between print:hidden">
        <div>
            <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-primary" />
            <CardTitle>Plan de Comidas Semanal</CardTitle>
            </div>
            <CardDescription>Arrastra y suelta recetas de tu biblioteca para planificar tu semana.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <FeatureHint
              id="autocomplete"
              title="Autocompletar el menú"
              text="La IA rellena los huecos vacíos respetando el tipo de comida de cada hueco y tu objetivo. Edita un hueco para cambiar su tipo."
              side="bottom"
              align="start"
            >
              <Button
                variant="outline"
                className="text-primary border-primary hover:bg-primary/10"
                onClick={onAutocomplete}
                disabled={isAutocompleting}
                data-tour="autocomplete"
              >
                <Sparkles className={cn("mr-2 h-4 w-4", isAutocompleting && "animate-spin")} />
                {isAutocompleting ? 'Pensando...' : 'Autocompletar'}
              </Button>
            </FeatureHint>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" data-tour="clear-plan">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar semana
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Limpiar toda la semana?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán todas las recetas de todos los días. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearWeek} className="bg-destructive hover:bg-destructive/90">
                    Sí, limpiar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="icon" onClick={handleDownloadImage} aria-label="Descargar plan como imagen" data-tour="download-plan">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)} data-tour="edit-plan">
                {isEditing ? <Check className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                {isEditing ? 'Finalizar Edición' : 'Editar Plan'}
            </Button>
        </div>
      </CardHeader>
      <CardContent ref={plannerRef} className="pb-4">
        <div className="printable-area flex gap-2">
          {weekPlan.map((dayPlan) => {
            const dayHasRecipes = dayPlan.meals.some(m => m.recipes.length > 0);
            return (
            <div key={dayPlan.day} className="flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-center gap-1 mb-2 group/day">
                  <h3 className="font-semibold text-center text-lg text-card-foreground">{dayPlan.day}</h3>
                  {dayHasRecipes && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover/day:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title={`Limpiar ${dayPlan.day}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-glass">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Limpiar {dayPlan.day}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminarán todas las recetas de {dayPlan.day}. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onClearDay(dayPlan.day)} className="bg-destructive hover:bg-destructive/90">
                            Sí, limpiar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                
                {isEditing && <AddMealButton onClick={() => onAddMeal(dayPlan.day, 0)} />}

                {dayPlan.meals.map((meal, index) => (
                  <React.Fragment key={meal.id}>
                     <MealSlot
                       day={dayPlan.day}
                       meal={meal}
                       isEditing={isEditing}
                       activeGoal={activeGoal}
                       onDrop={onDrop}
                       onClearMeal={onClearMeal}
                       onRecipeClick={onRecipeClick}
                       onRemoveRecipeFromMeal={onRemoveRecipeFromMeal}
                       onUpdateMealTitle={onUpdateMealTitle}
                       onUpdateMealTypes={onUpdateMealTypes}
                       onDeleteMeal={onDeleteMeal}
                       isActiveDropTarget={activeDropTarget?.day === dayPlan.day && activeDropTarget?.mealId === meal.id}
                       onSetDropTarget={onSetDropTarget}
                       onMealSlotClick={onMealSlotClick}
                       onDragEnterSlot={(d, m) => setHoveredSlot({day: d, mealId: m})}
                       onDragLeaveSlot={() => setHoveredSlot(null)}
                       isDragOverSlot={hoveredSlot?.day === dayPlan.day && hoveredSlot?.mealId === meal.id}
                       onUpdateServingsEaten={onUpdateServingsEaten}
                     />
                     {isEditing && <AddMealButton onClick={() => onAddMeal(dayPlan.day, index + 1)} />}
                  </React.Fragment>
                ))}
                
                <DailyTotalsRow
                  totals={dailyTotals.find(d => d.day === dayPlan.day)?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }}
                  previewTotals={(() => {
                    if (hoveredSlot?.day !== dayPlan.day) return null;
                    const r = dragStore.getDraggedRecipe();
                    if (!r) return null;
                    const s = r.servings ?? 1;
                    return { calories: r.calories / s, protein: r.protein / s, carbs: r.carbs / s, fat: r.fat / s };
                  })()}
                  goal={activeGoal}
                  className="p-3 mt-auto rounded-xl bg-background/80 border print:hidden"
                />
            </div>
            );
          })}
        </div>
      </CardContent>

      {/* ── Offscreen export layout ─────────────────────────────────────────
          A clean, purpose-built "cuadrante" captured by handleDownloadImage:
          full recipe names (wrapped, never truncated), servings as ×N, daily
          kcal totals — and none of the interactive controls. Inline hex styles
          on purpose: html2canvas renders them reliably, with brand colors. */}
      <div
        ref={exportRef}
        aria-hidden
        style={{
          position: 'fixed', left: -10000, top: 0, width: 1680, zIndex: -1,
          background: '#FFFDF9', color: '#3A2414', padding: '36px 40px 32px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 700, color: '#D9531F' }}>
            Plan de comidas de la semana
          </span>
          <span style={{ fontSize: 16, color: '#8A6A4A' }}>Nutrilp</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14, alignItems: 'stretch' }}>
          {weekPlan.map((dayPlan) => {
            const totals = dailyTotals.find(d => d.day === dayPlan.day)?.totals;
            return (
              <div key={dayPlan.day} style={{ display: 'flex', flexDirection: 'column', background: '#FBF6EE', border: '1px solid #E7DCC9', borderRadius: 14, padding: '12px 12px 10px' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 19, fontWeight: 700, color: '#D9531F', borderBottom: '2px solid #D9531F', paddingBottom: 6, marginBottom: 10, textAlign: 'center' }}>
                  {dayPlan.day}
                </div>
                {dayPlan.meals.map((meal) => (
                  <div key={meal.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A6A4A', marginBottom: 3 }}>
                      {meal.title}
                    </div>
                    {meal.recipes.length > 0 ? meal.recipes.map((recipe) => (
                      <div key={recipe.instanceId} style={{ fontSize: 14.5, lineHeight: 1.3, marginBottom: 3, overflowWrap: 'break-word' }}>
                        {recipe.name}
                        {(recipe.servingsEaten ?? 1) !== 1 && (
                          <span style={{ color: '#8A6A4A', fontSize: 12.5 }}> ×{recipe.servingsEaten}</span>
                        )}
                      </div>
                    )) : (
                      <div style={{ fontSize: 13, color: '#C6B593' }}>—</div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: 'auto' }}>
                  {totals && totals.calories > 0 && (
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#D9531F', borderTop: '1px solid #E7DCC9', paddingTop: 6, textAlign: 'right' }}>
                      {Math.round(totals.calories)} kcal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

    