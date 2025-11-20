'use client';

import React, { useState, useMemo, useRef, type DragEvent, type KeyboardEvent } from 'react';
import type { WeekPlan, Recipe, DailyTotal, Macros, GoalMacros, Meal, ActiveDropTarget, RecipeInstance } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, Plus, Edit, Check, Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import html2canvas from 'html2canvas';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  activeGoal: GoalMacros | null;
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId:string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onAddMeal: (day: string, index: number) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
  activeDropTarget: ActiveDropTarget | null;
  onSetDropTarget: (target: ActiveDropTarget | null) => void;
}

interface MealSlotProps {
  day: string;
  meal: any;
  isEditing: boolean;
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId: string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
  isActiveDropTarget: boolean;
  onSetDropTarget: (target: ActiveDropTarget | null) => void;
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

const DailyTotalsRow = ({ totals, goal, className }: { totals: Macros, goal: GoalMacros | null, className?: string }) => (
  <div className={cn("mt-auto pt-2 border-t", className)}>
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Flame className="h-5 w-5 text-primary" />
        <span className={cn("font-bold text-lg", getMacroColorClass(totals.calories, goal?.calories))}>
          {Math.round(totals.calories)}
        </span>
        <span className="text-muted-foreground text-sm">kcal</span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1 text-center text-xs mt-1">
      <div className="flex flex-col items-center p-1 rounded-md bg-secondary">
        <span className={cn("font-bold", getMacroColorClass(totals.protein, goal?.protein))}>{Math.round(totals.protein)}g</span>
        <span className="text-muted-foreground text-[10px]">Prot.</span>
      </div>
      <div className="flex flex-col items-center p-1 rounded-md bg-secondary">
        <span className={cn("font-bold", getMacroColorClass(totals.carbs, goal?.carbs))}>{Math.round(totals.carbs)}g</span>
        <span className="text-muted-foreground text-[10px]">Carbs</span>
      </div>
      <div className="flex flex-col items-center p-1 rounded-md bg-secondary">
        <span className={cn("font-bold", getMacroColorClass(totals.fat, goal?.fat))}>{Math.round(totals.fat)}g</span>
        <span className="text-muted-foreground text-[10px]">Grasa</span>
      </div>
    </div>
  </div>
);


function MealSlot({ day, meal, isEditing, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onDeleteMeal, isActiveDropTarget, onSetDropTarget }: MealSlotProps) {
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

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const recipeData = e.dataTransfer.getData('application/json');
    if (recipeData) {
      const recipe = JSON.parse(recipeData);
      onDrop(day, meal.id, recipe);
    }
  };

  const handleSlotClick = () => {
    onSetDropTarget({ day, mealId: meal.id });
  };

  const hasRecipes = meal.recipes.length > 0;

  return (
    <div 
      onDragOver={handleDragOver} 
      onDrop={handleDrop} 
      onClick={handleSlotClick}
      className={cn(
        "relative flex flex-col p-2 bg-background/80 border rounded-xl h-full min-h-[160px]",
        "cursor-pointer",
        isActiveDropTarget && "ring-2 ring-primary"
      )}
    >
      <div className="flex justify-between items-center mb-1 pl-1 group">
        {isEditingTitle ? (
           <Input 
             value={tempTitle}
             onChange={(e) => setTempTitle(e.target.value)}
             onBlur={handleTitleSave}
             onKeyDown={handleTitleKeyDown}
             autoFocus
             className="h-7 text-xs font-medium border-primary bg-input"
           />
        ) : (
            <h4
              className={cn("text-xs font-medium text-muted-foreground uppercase tracking-widest", isEditing && 'cursor-pointer hover:underline')}
              onClick={(e) => { e.stopPropagation(); if(isEditing) setIsEditingTitle(true); }}
            >
              {meal.title}
            </h4>
        )}

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
        hasRecipes ? 'bg-transparent' : 'border-2 border-dashed border-border/50 bg-secondary/30'
      )}>
        {hasRecipes ? (
           <div className="w-full h-full flex flex-col gap-1 flex-1">
                {meal.recipes.map((recipe: RecipeInstance) => (
                    <div key={`${recipe.id}-${recipe.instanceId}`} className="w-full relative group/item flex-1">
                      <div 
                          className="h-full w-full"
                          onClick={(e) => { e.stopPropagation(); onRecipeClick(recipe); }}
                      >
                          <RecipeCard 
                            recipe={recipe} 
                            isCompact 
                          />
                      </div>
                      
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1/2 -translate-y-1/2 right-0 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity z-10 bg-card/70 hover:bg-card"
                            onClick={(e) => { e.stopPropagation(); onRemoveRecipeFromMeal(day, meal.id, recipe.instanceId); }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                      
                    </div>
                ))}
            </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground px-2">Arrastra una receta aquí</p>
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

export function MealPlanner({ weekPlan, dailyTotals, activeGoal, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onAddMeal, onDeleteMeal, activeDropTarget, onSetDropTarget }: MealPlannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const plannerRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!plannerRef.current) return;
    setIsDownloading(true);
    
    const plannerElement = plannerRef.current;
    
    const clampedElements = Array.from(plannerElement.querySelectorAll('.line-clamp-3'));
    clampedElements.forEach(el => el.classList.remove('line-clamp-3'));

    try {
      const canvas = await html2canvas(plannerElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: `hsl(${getComputedStyle(document.body).getPropertyValue('--background').trim()})`,
      });
      
      const link = document.createElement('a');
      link.download = 'plan-de-comidas.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error downloading image:", error);
    } finally {
      clampedElements.forEach(el => el.classList.add('line-clamp-3'));
      setIsDownloading(false);
    }
  };


  return (
    <Card className="h-full bg-glass print:shadow-none print:border-none print:bg-transparent">
      <CardHeader className="flex-row items-center justify-between print:hidden">
        <div>
            <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-primary" />
            <CardTitle>Plan de Comidas Semanal</CardTitle>
            </div>
            <CardDescription>Arrastra y suelta recetas de tu biblioteca para planificar tu semana.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Download className="h-4 w-4 animate-pulse" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? <Check className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                {isEditing ? 'Finalizar Edición' : 'Editar Plan'}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div ref={plannerRef} className="flex gap-2 printable-area">
          {weekPlan.map((dayPlan) => (
            <div key={dayPlan.day} className="flex-1 flex flex-col gap-2">
                <h3 className="font-semibold text-center text-lg text-card-foreground mb-2">{dayPlan.day}</h3>
                
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
                     />
                     {isEditing && <AddMealButton onClick={() => onAddMeal(dayPlan.day, index + 1)} />}
                  </React.Fragment>
                ))}
                
                <DailyTotalsRow
                  totals={dailyTotals.find(d => d.day === dayPlan.day)?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }}
                  goal={activeGoal}
                  className="p-3 mt-auto rounded-xl bg-background/80 border print:hidden"
                />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
