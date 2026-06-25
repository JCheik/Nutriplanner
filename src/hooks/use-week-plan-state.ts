'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { updateDayPlanTransaction } from '@/firebase/firestore-operations';
import { INITIAL_WEEK_PLAN, DAY_ORDER } from '@/lib/data';
import type { Recipe, Meal, DayPlan, RecipeInstance, MealCategory } from '@/lib/types';

// Infer a meal's category from its title for legacy slots saved before mealType
// existed. Read-only inference (does not write to Firestore unless the user edits).
function inferMealType(title: string): MealCategory {
  const t = title.toLowerCase();
  if (t.includes('desayuno') || t.includes('breakfast') || t.includes('mañana')) return 'desayuno';
  if (t.includes('almuerzo') || t.includes('comida') || t.includes('lunch')) return 'almuerzo';
  if (t.includes('cena') || t.includes('dinner') || t.includes('supper')) return 'cena';
  if (t.includes('merienda') || t.includes('tentempié') || t.includes('tentempie')) return 'merienda';
  if (t.includes('snack')) return 'snack';
  if (t.includes('postre') || t.includes('dessert')) return 'postre';
  return 'otro';
}

export function useWeekPlanState() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // --- Firestore Data ---
  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  // --- Memoized Data Source ---
  const currentWeekPlan = useMemo(() => {
    if (weekPlanData === null) return INITIAL_WEEK_PLAN; // Return initial plan while loading or if no data
    
    const planMap = new Map(weekPlanData.map(day => [day.day, day]));

    return DAY_ORDER.map(dayName => {
      const savedDay = planMap.get(dayName as DayPlan['day']);
      const initialDay = INITIAL_WEEK_PLAN.find(d => d.day === dayName)!;
      if (savedDay) {
        const rawMeals = Array.isArray(savedDay.meals) ? savedDay.meals : [];
        // Normalise mealTypes for legacy slots: prefer the new plural field, then
        // the old singular `mealType`, then infer from the title.
        const meals = rawMeals.map(meal => {
          if (Array.isArray(meal.mealTypes) && meal.mealTypes.length > 0) return meal;
          const legacySingle = (meal as { mealType?: MealCategory }).mealType;
          const mealTypes = legacySingle ? [legacySingle] : [inferMealType(meal.title)];
          return { ...meal, mealTypes };
        });
        return { ...initialDay, ...savedDay, day: dayName as DayPlan['day'], meals };
      }
      return initialDay;
    });
  }, [weekPlanData]);

  // Per-day write queue: serializes concurrent writes to the same day.
  // Writes to different days are independent and run in parallel.
  const pendingWritesByDayRef = useRef<Map<string, Promise<void>>>(new Map());

  const updateDayPlanInFirestore = useCallback((day: string, modifierFn: (dayPlan: DayPlan) => DayPlan) => {
    if (!user || !firestore) return;

    const pending = pendingWritesByDayRef.current.get(day) ?? Promise.resolve();
    const next = pending
      .then(() => updateDayPlanTransaction(firestore, user.uid, day, modifierFn))
      .catch((error) => console.error(`Failed to update day plan (${day}):`, error));

    pendingWritesByDayRef.current.set(day, next);
  }, [user, firestore]);

  // --- Handlers ---
  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe, servingsEaten: number = 1) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => {
      const newRecipeInstance: RecipeInstance = { ...droppedRecipe, instanceId: self.crypto.randomUUID(), servingsEaten };
      return {
        ...currentDayPlan,
        meals: currentDayPlan.meals.map(meal =>
          meal.id === mealId ? { ...meal, recipes: [...meal.recipes, newRecipeInstance] } : meal
        )
      };
    });
  }, [updateDayPlanInFirestore]);
  
  const handleClearMeal = useCallback((day: string, mealId: string) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.map(meal => 
        meal.id === mealId ? { ...meal, recipes: [] } : meal
      )
    }));
  }, [updateDayPlanInFirestore]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeInstanceId: string) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.map(meal => {
        if (meal.id !== mealId) return meal;
        const updatedRecipes = meal.recipes.filter(r => r.instanceId !== recipeInstanceId);
        return { ...meal, recipes: updatedRecipes };
      })
    }));
  }, [updateDayPlanInFirestore]);

  const handleUpdateMealTitle = useCallback((day: string, mealId: string, newTitle: string) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.map(meal =>
        meal.id === mealId ? { ...meal, title: newTitle } : meal
      )
    }));
  }, [updateDayPlanInFirestore]);

  const handleUpdateMealTypes = useCallback((day: string, mealId: string, mealTypes: MealCategory[]) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.map(meal =>
        meal.id === mealId ? { ...meal, mealTypes } : meal
      )
    }));
  }, [updateDayPlanInFirestore]);

  const handleAddMeal = useCallback((day: string, index: number) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => {
      const newMeal: Meal = { id: `meal-${self.crypto.randomUUID()}`, title: 'Nueva Comida', recipes: [], mealTypes: ['otro'] };
      const updatedMeals = [...currentDayPlan.meals];
      updatedMeals.splice(index, 0, newMeal);
      return { ...currentDayPlan, meals: updatedMeals };
    });
  }, [updateDayPlanInFirestore]);

  const handleDeleteMeal = useCallback((day: string, mealId: string) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.filter(meal => meal.id !== mealId)
    }));
  }, [updateDayPlanInFirestore]);

  const handleUpdateServingsEaten = useCallback((day: string, mealId: string, instanceId: string, servings: number) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.map(meal => {
        if (meal.id !== mealId) return meal;
        return {
          ...meal,
          recipes: meal.recipes.map(recipe =>
            recipe.instanceId === instanceId ? { ...recipe, servingsEaten: servings } : recipe
          )
        };
      })
    }));
  }, [updateDayPlanInFirestore]);

  const handleClearDay = useCallback((day: string) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => ({
      ...currentDayPlan,
      meals: currentDayPlan.meals.map(meal => ({ ...meal, recipes: [] })),
    }));
  }, [updateDayPlanInFirestore]);

  const handleClearWeek = useCallback(() => {
    currentWeekPlan.forEach(dayPlan => {
      updateDayPlanInFirestore(dayPlan.day, (currentDayPlan) => ({
        ...currentDayPlan,
        meals: currentDayPlan.meals.map(meal => ({ ...meal, recipes: [] })),
      }));
    });
  }, [currentWeekPlan, updateDayPlanInFirestore]);

  return {
    currentWeekPlan,
    weekPlanLoading,
    handleDrop,
    handleClearMeal,
    handleClearDay,
    handleClearWeek,
    handleRemoveRecipeFromMeal,
    handleUpdateMealTitle,
    handleUpdateMealTypes,
    handleAddMeal,
    handleDeleteMeal,
    handleUpdateServingsEaten,
  };
}
