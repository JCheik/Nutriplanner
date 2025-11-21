'use client';

import type { DayPlan, GoalMacros, Recipe, RecipeInstance } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Droplets, EggFried, Wheat, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecipeCard } from "./recipe-card";

interface TodayPlanProps {
    dayPlan: DayPlan | null;
    activeGoal: GoalMacros | null;
    onRecipeClick: (recipe: Recipe) => void;
}

const getMacroColorClass = (current: number, target: number | undefined): string => {
    if (target === undefined || target === 0) return 'text-foreground';
    const ratio = current / target;
    if (ratio >= 0.9 && ratio <= 1.1) return 'text-green-600 dark:text-green-500';
    if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) return 'text-orange-500 dark:text-orange-400';
    if (ratio < 0.75 || ratio > 1.25) return 'text-destructive';
    return 'text-foreground';
};

export function TodayPlan({ dayPlan, activeGoal, onRecipeClick }: TodayPlanProps) {
    const totals = dayPlan?.meals.reduce((acc, meal) => {
        meal.recipes.forEach(recipe => {
            acc.calories += recipe.calories;
            acc.protein += recipe.protein;
            acc.carbs += recipe.carbs;
            acc.fat += recipe.fat;
        });
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    if (!dayPlan || !totals) {
        return (
             <Card className="bg-glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sunrise className="h-6 w-6 text-primary" /> Tu Plan para Hoy</CardTitle>
                    <CardDescription>Aquí aparecerá tu plan de comidas para el día de hoy.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No hay nada planeado para hoy. ¡Añade algunas recetas!</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-glass">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Sunrise className="h-6 w-6 text-primary" /> Tu Plan para Hoy: {dayPlan.day}</CardTitle>
                        <CardDescription>Un resumen de tus comidas y macros para el día.</CardDescription>
                    </div>
                    <div className="text-right">
                         <div className="flex items-center gap-1 justify-end">
                            <Flame className="h-5 w-5 text-primary" />
                            <span className={cn("font-bold text-lg", getMacroColorClass(totals.calories, activeGoal?.calories))}>
                                {Math.round(totals.calories)}
                            </span>
                             <span className="text-muted-foreground text-sm">/ {activeGoal ? Math.round(activeGoal.calories) : '-'} kcal</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center text-xs mt-1">
                            <div className="flex flex-col items-center">
                                <span className={cn("font-bold", getMacroColorClass(totals.protein, activeGoal?.protein))}>{Math.round(totals.protein)}g</span>
                                <span className="text-muted-foreground">Prot.</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className={cn("font-bold", getMacroColorClass(totals.carbs, activeGoal?.carbs))}>{Math.round(totals.carbs)}g</span>
                                <span className="text-muted-foreground">Carbs</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className={cn("font-bold", getMacroColorClass(totals.fat, activeGoal?.fat))}>{Math.round(totals.fat)}g</span>
                                <span className="text-muted-foreground">Grasa</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dayPlan.meals.map(meal => (
                        <div key={meal.id}>
                            <h4 className="font-semibold mb-2 uppercase text-sm tracking-wider text-muted-foreground">{meal.title}</h4>
                            <div className="space-y-2">
                                {meal.recipes.length > 0 ? (
                                    meal.recipes.map((recipe: RecipeInstance) => (
                                        <div key={recipe.instanceId} className="h-20">
                                            <RecipeCard 
                                                recipe={recipe} 
                                                onClick={() => onRecipeClick(recipe)}
                                                isCompact
                                                className="text-xs"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-20 flex items-center justify-center border-2 border-dashed rounded-lg">
                                        <p className="text-xs text-muted-foreground">Sin recetas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
