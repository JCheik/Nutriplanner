'use client';

import React, { useState, useMemo, type DragEvent, type KeyboardEvent } from 'react';
import type { WeekPlan, Recipe, DailyTotal, Macros, GoalMacros, Meal, ActiveDropTarget, RecipeInstance } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, Plus, Edit, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  activeGoal: GoalMacros | null;
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId:string, recipeInstanceId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onAddMeal: (day: string) => void;
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
        "relative flex flex-col p-2 bg-background/80 border rounded-xl h-full min-h-[120px]",
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
        hasRecipes ? 'bg-secondary/50 border-2 border-transparent' : 'border-2 border-dashed border-border/50 bg-secondary/30'
      )}>
        {hasRecipes ? (
           <div className="w-full h-full flex flex-col gap-1 flex-1">
                {meal.recipes.map((recipe: RecipeInstance) => (
                    <div key={recipe.instanceId} className="w-full relative group/item flex-1">
                      <div 
                          className="h-full w-full"
                          onClick={(e) => { e.stopPropagation(); onRecipeClick(recipe); }}
                      >
                          <RecipeCard 
                            recipe={recipe} 
                            isCompact 
                          />
                      </div>
                      {isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1/2 -translate-y-1/2 right-0 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity z-10 bg-card/70 hover:bg-card"
                            onClick={(e) => { e.stopPropagation(); onRemoveRecipeFromMeal(day, meal.id, recipe.instanceId); }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                      )}
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

export function MealPlanner({ weekPlan, dailyTotals, activeGoal, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onAddMeal, onDeleteMeal, activeDropTarget, onSetDropTarget }: MealPlannerProps) {
  const [isEditing, setIsEditing] = useState(false);

  const mealRows = useMemo(() => {
    if (!weekPlan || weekPlan.length === 0) return [];
    
    const maxMealsPerDay = Math.max(...weekPlan.map(day => day.meals.length), 0);
    const rows: (Meal | null)[][] = Array.from({ length: maxMealsPerDay }, () => Array(weekPlan.length).fill(null));

    weekPlan.forEach((dayPlan, dayIndex) => {
      dayPlan.meals.forEach((meal, mealIndex) => {
        if (mealIndex < maxMealsPerDay) {
          rows[mealIndex][dayIndex] = meal;
        }
      });
    });

    return rows;
  }, [weekPlan]);


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
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <Check className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
            {isEditing ? 'Finalizar Edición' : 'Editar Plan'}
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-7 gap-2">
          {weekPlan.map((dayPlan) => (
            <h3 key={dayPlan.day} className="font-semibold text-center text-lg text-card-foreground mb-2">{dayPlan.day}</h3>
          ))}
          
          {mealRows.map((row, rowIndex) => (
            <React.Fragment key={`row-${rowIndex}`}>
              {row.map((meal, dayIndex) => {
                 const dayPlan = weekPlan[dayIndex];
                 if (meal) {
                   return (
                     <MealSlot
                       key={meal.id}
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
                   );
                 }
                 // Render an empty placeholder if the meal doesn't exist for that day
                 return <div key={`empty-${dayIndex}-${rowIndex}`} className="p-2 border rounded-xl bg-background/80 border-transparent h-full min-h-[5rem]" />;
              })}
            </React.Fragment>
          ))}
          
          {isEditing && (
             <div className="col-span-7 grid grid-cols-7 gap-2 mt-2">
              {weekPlan.map(dayPlan => (
                <div key={`add-meal-${dayPlan.day}`}>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => onAddMeal(dayPlan.day)}>
                      <Plus className="h-4 w-4 mr-2"/> Añadir Comida
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="col-span-7 grid grid-cols-7 gap-2 mt-2">
            {weekPlan.map((dayPlan) => (
              <DailyTotalsRow
                  key={`totals-${dayPlan.day}`}
                  totals={dailyTotals.find(d => d.day === dayPlan.day)?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }}
                  goal={activeGoal}
                  className="p-3 rounded-xl bg-background/80 border print:hidden"
                />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
