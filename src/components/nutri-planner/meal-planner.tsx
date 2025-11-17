'use client';

import type { DragEvent } from 'react';
import type { WeekPlan, MealType, Recipe, DailyTotal, Macros } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, EggFried, Wheat, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  onDrop: (day: string, mealType: MealType, recipe: Recipe) => void;
  onClearMeal: (day: string, mealType: MealType) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealType: MealType, recipeId: string) => void;
}

interface MealSlotProps {
  day: string;
  mealType: MealType;
  mealRecipes: Recipe[];
  onDrop: (day: string, mealType: MealType, recipe: Recipe) => void;
  onClearMeal: (day: string, mealType: MealType) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealType: MealType, recipeId: string) => void;
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


function MealSlot({ day, mealType, mealRecipes, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal }: MealSlotProps) {
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
    onDrop(day, mealType, recipe);
  };
  
  const mealTitles: Record<MealType, string> = {
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    snack: 'Merienda',
    dinner: 'Cena',
  };
  const mealTitle = mealTitles[mealType];

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop} className="relative flex flex-col h-full">
      <div className="flex justify-between items-center mb-1 pl-1">
        <h4 className="text-xs font-medium text-muted-foreground">{mealTitle}</h4>
        {mealRecipes.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onClearMeal(day, mealType); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-[5rem] rounded-lg border-2 border-dashed bg-muted/50 p-1 flex flex-col items-center justify-center gap-1 relative group overflow-hidden">
        {mealRecipes.length > 0 ? (
           <div className="w-full h-full flex flex-col gap-1">
                {mealRecipes.map((recipe, index) => (
                    <div key={recipe.id} className="w-full relative group/item flex-1">
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
                        onClick={(e) => { e.stopPropagation(); onRemoveRecipeFromMeal(day, mealType, recipe.id); }}
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

export function MealPlanner({ weekPlan, dailyTotals, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal }: MealPlannerProps) {
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
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4">
            {weekPlan.map(({ day, meals }) => {
                const dayTotals = dailyTotals.find(d => d.day === day)?.totals;
                return (
                <div key={day} className="flex flex-col gap-3 p-3 rounded-xl bg-secondary/50 w-[200px] flex-shrink-0">
                    <h3 className="font-semibold text-center text-lg text-card-foreground">{day}</h3>
                    <div className="space-y-2 flex-1 flex flex-col h-[400px]">
                      <MealSlot day={day} mealType="breakfast" mealRecipes={meals.breakfast.recipes} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} onRemoveRecipeFromMeal={onRemoveRecipeFromMeal} />
                      <MealSlot day={day} mealType="lunch" mealRecipes={meals.lunch.recipes} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} onRemoveRecipeFromMeal={onRemoveRecipeFromMeal} />
                      <MealSlot day={day} mealType="snack" mealRecipes={meals.snack.recipes} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} onRemoveRecipeFromMeal={onRemoveRecipeFromMeal} />
                      <MealSlot day={day} mealType="dinner" mealRecipes={meals.dinner.recipes} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} onRemoveRecipeFromMeal={onRemoveRecipeFromMeal} />
                    </div>
                    {dayTotals && <DailyTotalsRow totals={dayTotals} />}
                </div>
                );
            })}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
