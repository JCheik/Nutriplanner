'use client';

import { useState, type DragEvent, type KeyboardEvent } from 'react';
import type { WeekPlan, Recipe, DailyTotal, Macros, Meal } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, EggFried, Wheat, Droplets, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId: string, recipeId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onAddMeal: (day: string) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
}

interface MealSlotProps {
  day: string;
  meal: Meal;
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId: string, recipeId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
}

const DailyTotalsRow = ({ totals }: { totals: Macros }) => (
  <div className="mt-2 pt-2 border-t">
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Flame className="h-5 w-5 text-orange-500" />
        <span className="font-bold text-lg">{Math.round(totals.calories)}</span>
        <span className="text-muted-foreground text-sm">kcal</span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1 text-center text-xs mt-1">
      <div className="flex flex-col items-center p-1">
        <EggFried className="h-4 w-4 text-amber-600" />
        <span className="font-bold">{Math.round(totals.protein)}</span>
        <span className="text-muted-foreground text-[10px]">g</span>
      </div>
      <div className="flex flex-col items-center p-1">
        <Wheat className="h-4 w-4 text-yellow-500" />
        <span className="font-bold">{Math.round(totals.carbs)}</span>
        <span className="text-muted-foreground text-[10px]">g</span>
      </div>
      <div className="flex flex-col items-center p-1">
        <Droplets className="h-4 w-4 text-sky-500" />
        <span className="font-bold">{Math.round(totals.fat)}</span>
        <span className="text-muted-foreground text-[10px]">g</span>
      </div>
    </div>
  </div>
);


function MealSlot({ day, meal, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onDeleteMeal }: MealSlotProps) {
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
    const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
    onDrop(day, meal.id, recipe);
  };

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop} className="relative flex flex-col h-full">
      <div className="flex justify-between items-center mb-1 pl-1 group">
        {isEditingTitle ? (
           <Input 
             value={tempTitle}
             onChange={(e) => setTempTitle(e.target.value)}
             onBlur={handleTitleSave}
             onKeyDown={handleTitleKeyDown}
             autoFocus
             className="h-7 text-xs font-medium border-primary"
           />
        ) : (
            <h4
              className="text-xs font-medium text-muted-foreground cursor-pointer"
              onClick={() => setIsEditingTitle(true)}
            >
              {meal.title}
            </h4>
        )}

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingTitle(true)}><Edit className="h-3 w-3"/></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteMeal(day, meal.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button>
          {meal.recipes.length > 0 && (
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
      <div className="flex-1 min-h-[5rem] rounded-lg border-2 border-dashed bg-muted/50 p-1 flex flex-col items-center justify-center gap-1 relative group overflow-hidden">
        {meal.recipes.length > 0 ? (
           <div className="w-full h-full flex flex-col gap-1">
                {meal.recipes.map((recipe, index) => (
                    <div key={`${recipe.id}-${index}`} className="w-full relative group/item flex-1">
                    <div 
                        className="h-full w-full"
                        onClick={() => onRecipeClick(recipe)}
                    >
                        <RecipeCard 
                          recipe={recipe} 
                          isCompact 
                          colorVariant={index % 2 === 0 ? 'primary' : 'secondary'}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 -translate-y-1/2 right-0 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity z-10 bg-card/70 hover:bg-card"
                        onClick={(e) => { e.stopPropagation(); onRemoveRecipeFromMeal(day, meal.id, recipe.id); }}
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

export function MealPlanner({ weekPlan, dailyTotals, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onAddMeal, onDeleteMeal }: MealPlannerProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <CardTitle>Plan de Comidas Semanal</CardTitle>
        </div>
        <CardDescription>Arrastra y suelta recetas de tu biblioteca para planificar tu semana.</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {weekPlan.map(({ day, meals }) => {
              const dayTotals = dailyTotals.find(d => d.day === day)?.totals;
              return (
              <div key={day} className="flex flex-col gap-3 p-3 rounded-xl bg-secondary/50 min-w-[200px]">
                  <h3 className="font-semibold text-center text-lg text-card-foreground">{day}</h3>
                  <div className="space-y-2 flex-1 flex flex-col min-h-[400px]">
                    {meals.map(meal => (
                       <MealSlot 
                        key={meal.id}
                        day={day} 
                        meal={meal}
                        onDrop={onDrop} 
                        onClearMeal={onClearMeal} 
                        onRecipeClick={onRecipeClick} 
                        onRemoveRecipeFromMeal={onRemoveRecipeFromMeal}
                        onUpdateMealTitle={onUpdateMealTitle}
                        onDeleteMeal={onDeleteMeal}
                       />
                    ))}
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAddMeal(day)}>
                      <Plus className="h-4 w-4 mr-2"/> Añadir Comida
                    </Button>
                  </div>
                  {dayTotals && <DailyTotalsRow totals={dayTotals} />}
              </div>
              );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
