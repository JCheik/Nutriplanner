'use client';

import React, { useState, useRef, type DragEvent, type KeyboardEvent } from 'react';
import html2canvas from 'html2canvas';
import type { WeekPlan, Recipe, DailyTotal, Macros, GoalMacros, Meal, ActiveDropTarget, RecipeInstance } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, Plus, Edit, Check, Download, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { dragStore } from '@/lib/drag-store';
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
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onClearDay: (day: string) => void;
  onClearWeek: () => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId:string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
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
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId: string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
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
    <div className="w-full relative group/item flex-1 min-h-[60px]">
      <div
        className="h-full w-full flex flex-col items-center justify-center p-2 rounded-md bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer gap-1"
        onClick={() => onRecipeClick(recipe)}
      >
        <span className="text-center font-semibold text-secondary-foreground text-xs leading-tight line-clamp-2">
          {recipe.name}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-sm font-bold leading-none"
            onClick={() => onUpdateServings(Math.max(1, servingsEaten - 1))}
          >−</button>
          <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
            {servingsEaten} rac · {kcal} kcal
          </span>
          <button
            className="h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-sm font-bold leading-none"
            onClick={() => onUpdateServings(servingsEaten + 1)}
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

function MealSlot({ day, meal, isEditing, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onDeleteMeal, isActiveDropTarget, onSetDropTarget, onMealSlotClick, onDragEnterSlot, onDragLeaveSlot, isDragOverSlot, onUpdateServingsEaten }: MealSlotProps) {
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
      const recipe = JSON.parse(recipeData);
      onDrop(day, meal.id, recipe);
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
        "relative flex flex-col p-2 bg-background/80 border rounded-xl h-full min-h-[160px]",
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
      <div className={cn(
        "rounded-lg p-1 flex-1 flex flex-col items-center justify-center gap-1 relative group transition-colors",
        hasRecipes || isDragOverSlot ? 'bg-transparent' : 'border-2 border-dashed border-border/50 bg-secondary/30'
      )}>
        {hasRecipes ? (
           <div className="w-full h-full flex flex-col gap-1 flex-1">
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

export function MealPlanner({ weekPlan, dailyTotals, activeGoal, onDrop, onClearMeal, onClearDay, onClearWeek, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onAddMeal, onDeleteMeal, activeDropTarget, onSetDropTarget, onMealSlotClick, onAutocomplete, isAutocompleting, onUpdateServingsEaten }: MealPlannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<{day: string, mealId: string} | null>(null);
  const plannerRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!plannerRef.current) return;

    const canvas = await html2canvas(plannerRef.current, {
      useCORS: true,
      backgroundColor: '#ffffff', // Explicitly set a white background for the capture
      scale: 2, // Increase resolution for better quality
    });
    const link = document.createElement('a');
    link.download = 'plan-de-comidas.png';
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
            <Button variant="outline" size="icon" onClick={handleDownloadImage}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
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
                       onDrop={onDrop}
                       onClearMeal={onClearMeal}
                       onRecipeClick={onRecipeClick}
                       onRemoveRecipeFromMeal={onRemoveRecipeFromMeal}
                       onUpdateMealTitle={onUpdateMealTitle}
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
    </Card>
  );
}

    