'use client';

import { useState, useMemo, type DragEvent, type KeyboardEvent } from 'react';
import type { WeekPlan, Recipe, DailyTotal, Macros, GoalMacros, Meal } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeCard } from './recipe-card';
import { Button } from '@/components/ui/button';
import { CalendarDays, X, Flame, Plus, Edit, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

interface MealPlannerProps {
  weekPlan: WeekPlan;
  dailyTotals: DailyTotal[];
  activeGoal: GoalMacros | null;
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
  meal: any;
  isEditing: boolean;
  onDrop: (day: string, mealId: string, recipe: Recipe) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRemoveRecipeFromMeal: (day: string, mealId: string, recipeId: string) => void;
  onUpdateMealTitle: (day: string, mealId: string, newTitle: string) => void;
  onAddMeal: (day: string) => void;
  onDeleteMeal: (day: string, mealId: string) => void;
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


function MealSlot({ day, meal, isEditing, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onDeleteMeal }: MealSlotProps) {
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

  const hasRecipes = meal.recipes.length > 0;

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop} className="relative flex flex-col p-2 bg-background/80 border rounded-xl h-full min-h-[10rem]">
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
              onClick={() => isEditing && setIsEditingTitle(true)}
            >
              {meal.title}
            </h4>
        )}

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingTitle(true)}><Edit className="h-3 w-3"/></Button>}
          {isEditing && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteMeal(day, meal.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button>}
          
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
                {meal.recipes.map((recipe: Recipe, index: number) => (
                    <div key={`${recipe.id}-${index}`} className="w-full relative group/item flex-1">
                      <div 
                          className="h-full w-full"
                          onClick={() => onRecipeClick(recipe)}
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

export function MealPlanner({ weekPlan, dailyTotals, activeGoal, onDrop, onClearMeal, onRecipeClick, onRemoveRecipeFromMeal, onUpdateMealTitle, onAddMeal, onDeleteMeal }: MealPlannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(new Date().getDay() -1); // Monday is 0

  const mealTypes = useMemo(() => {
    const allMealTitles = new Set<string>();
    weekPlan.forEach(day => day.meals.forEach(meal => allMealTitles.add(meal.title)));
    
    // Define a default order, then add any other dynamic titles
    const orderedTitles = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];
    const orderedSet = new Set(orderedTitles);
    allMealTitles.forEach(title => orderedSet.add(title));
    
    return Array.from(orderedSet);
  }, [weekPlan]);

  const handleNextDay = () => {
    setActiveDayIndex((prev) => (prev + 1) % 7);
  };

  const handlePrevDay = () => {
    setActiveDayIndex((prev) => (prev - 1 + 7) % 7);
  };
  
  return (
    <Card className="h-full bg-glass">
      <CardHeader className="flex-row items-center justify-between">
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
        {/* Mobile View - Single Day */}
        <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={handlePrevDay}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-center text-lg text-card-foreground">{weekPlan[activeDayIndex].day}</h3>
                <Button variant="outline" size="icon" onClick={handleNextDay}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {weekPlan[activeDayIndex].meals.map(meal => (
                    <MealSlot 
                        key={meal.id}
                        day={weekPlan[activeDayIndex].day} 
                        meal={meal}
                        isEditing={isEditing}
                        onDrop={onDrop} 
                        onClearMeal={onClearMeal} 
                        onRecipeClick={onRecipeClick} 
                        onRemoveRecipeFromMeal={onRemoveRecipeFromMeal}
                        onUpdateMealTitle={onUpdateMealTitle}
                        onAddMeal={onAddMeal}
                        onDeleteMeal={onDeleteMeal}
                    />
                ))}
                 {isEditing && (
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAddMeal(weekPlan[activeDayIndex].day)}>
                        <Plus className="h-4 w-4 mr-2"/> Añadir Comida
                    </Button>
                )}
                 <DailyTotalsRow 
                    totals={dailyTotals.find(d => d.day === weekPlan[activeDayIndex].day)!.totals} 
                    goal={activeGoal}
                    className="flex flex-col gap-3 p-3 rounded-xl bg-background/80 border mt-4 sm:col-span-2"
                  />
            </div>
        </div>

        {/* Desktop View - Full Week */}
        <div className="hidden lg:grid grid-cols-7 gap-x-4">
            {/* Day Titles */}
            {weekPlan.map(({ day }) => (
                <h3 key={`${day}-header`} className="font-semibold text-center text-lg text-card-foreground mb-4">{day}</h3>
            ))}

            {/* Meal Rows */}
            {mealTypes.map(mealTitle => (
                <React.Fragment key={mealTitle}>
                    {weekPlan.map(dayPlan => {
                        const meal = dayPlan.meals.find(m => m.title === mealTitle);
                        return meal ? (
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
                                onAddMeal={onAddMeal}
                                onDeleteMeal={onDeleteMeal}
                            />
                        ) : (
                            <div key={`${dayPlan.day}-${mealTitle}`} className="p-2 border rounded-xl bg-background/80 border-transparent min-h-[10rem]">
                                {isEditing && (
                                    <div className="h-full flex items-center justify-center">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => onAddMeal(dayPlan.day)}>
                                            <Plus className="h-4 w-4 mr-2"/> Añadir Comida
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
            
            {/* Daily Totals */}
            {weekPlan.map(({ day }) => {
                const dayTotalsData = dailyTotals.find(d => d.day === day)?.totals;
                return (
                  <React.Fragment key={`${day}-footer`}>
                      {dayTotalsData && 
                        <DailyTotalsRow 
                          totals={dayTotalsData} 
                          goal={activeGoal} 
                          className="flex flex-col gap-3 p-3 rounded-xl bg-background/80 border mt-4" 
                        />
                      }
                  </React.Fragment>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
