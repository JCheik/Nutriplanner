'use client';

import type { DragEvent } from 'react';
import type { WeekPlan, MealType, Recipe, DailyTotal, Macros } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, EggFried, Wheat, Droplets } from 'lucide-react';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  onDrop: (day: string, mealType: MealType, recipe: Recipe) => void;
  onClearMeal: (day: string, mealType: MealType) => void;
  onRecipeClick: (recipe: Recipe) => void;
}

interface MealSlotProps {
  day: string;
  mealType: MealType;
  mealRecipe: Recipe | null;
  onDrop: (day: string, mealType: MealType, recipe: Recipe) => void;
  onClearMeal: (day: string, mealType: MealType) => void;
  onRecipeClick: (recipe: Recipe) => void;
}

const DailyTotalsRow = ({ totals }: { totals: Macros }) => (
  <div className="mt-4 pt-3 border-t">
    <h4 className="text-sm font-semibold text-center mb-2">Totales del Día</h4>
    <div className="grid grid-cols-4 gap-1 text-center text-xs">
      <div className="flex flex-col items-center p-1">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="font-bold">{Math.round(totals.calories)}</span>
        <span className="text-muted-foreground text-[10px]">kcal</span>
      </div>
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


function MealSlot({ day, mealType, mealRecipe, onDrop, onClearMeal, onRecipeClick }: MealSlotProps) {
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
    <div onDragOver={handleDragOver} onDrop={handleDrop} className="relative">
      <h4 className="text-sm font-medium text-muted-foreground mb-2 pl-1">{mealTitle}</h4>
      <div className="min-h-28 rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center p-2 relative group">
        {mealRecipe ? (
          <>
            <div className="w-full h-full cursor-pointer" onClick={() => onRecipeClick(mealRecipe)}>
              <RecipeCard recipe={mealRecipe} isCompact />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-card/70 hover:bg-card"
              onClick={(e) => { e.stopPropagation(); onClearMeal(day, mealType); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <p className="text-xs text-center text-muted-foreground px-2">Arrastra una receta aquí</p>
        )}
      </div>
    </div>
  );
}

export function MealPlanner({ weekPlan, dailyTotals, onDrop, onClearMeal, onRecipeClick }: MealPlannerProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <CardTitle>Plan de Comidas Semanal</CardTitle>
        </div>
        <CardDescription>Arrastra y suelta recetas de tu biblioteca para planificar tu semana.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4">
        <div className="grid grid-flow-col auto-cols-fr gap-4 min-w-[1200px]">
          {weekPlan.map(({ day, meals }) => {
            const dayTotals = dailyTotals.find(d => d.day === day)?.totals;
            return (
              <div key={day} className="flex flex-col gap-4 p-4 rounded-xl bg-secondary/50 w-[200px] flex-shrink-0">
                <h3 className="font-semibold text-center text-lg text-card-foreground">{day}</h3>
                <div className="space-y-4">
                  <MealSlot day={day} mealType="breakfast" mealRecipe={meals.breakfast.recipe} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} />
                  <MealSlot day={day} mealType="lunch" mealRecipe={meals.lunch.recipe} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} />
                  <MealSlot day={day} mealType="snack" mealRecipe={meals.snack.recipe} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} />
                  <MealSlot day={day} mealType="dinner" mealRecipe={meals.dinner.recipe} onDrop={onDrop} onClearMeal={onClearMeal} onRecipeClick={onRecipeClick} />
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
