'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { updateDayPlanTransaction } from '@/firebase/firestore-operations';
import { INITIAL_WEEK_PLAN, DAY_ORDER } from '@/lib/data';
import type { WeekPlan, Recipe, Meal, DayPlan, RecipeInstance } from '@/lib/types';

// --- Helper Functions ---
const addRecipeToMeal = (plan: WeekPlan, day: string, mealId: string, recipe: Recipe): WeekPlan => {
  const newRecipeInstance: RecipeInstance = { ...recipe, instanceId: self.crypto.randomUUID(), servingsEaten: 1 };
  return plan.map(dayPlan =>
    dayPlan.day === day
      ? { ...dayPlan, meals: dayPlan.meals.map(meal => meal.id === mealId ? { ...meal, recipes: [...meal.recipes, newRecipeInstance] } : meal) }
      : dayPlan
  );
};

const clearMealRecipes = (plan: WeekPlan, day: string, mealId: string): WeekPlan => {
  return plan.map(dayPlan =>
    dayPlan.day === day
      ? { ...dayPlan, meals: dayPlan.meals.map(meal => meal.id === mealId ? { ...meal, recipes: [] } : meal) }
      : dayPlan
  );
};

const removeRecipeFromMeal = (plan: WeekPlan, day: string, mealId: string, recipeInstanceId: string): WeekPlan => {
  return plan.map(dayPlan =>
    dayPlan.day === day
      ? {
        ...dayPlan,
        meals: dayPlan.meals.map(meal => {
          if (meal.id !== mealId) return meal;
          const updatedRecipes = meal.recipes.filter(r => r.instanceId !== recipeInstanceId);
          return { ...meal, recipes: updatedRecipes };
        })
      }
      : dayPlan
  );
};

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
        const meals = Array.isArray(savedDay.meals) ? savedDay.meals : [];
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
  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => {
      const newRecipeInstance: RecipeInstance = { ...droppedRecipe, instanceId: self.crypto.randomUUID(), servingsEaten: 1 };
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

  const handleAddMeal = useCallback((day: string, index: number) => {
    updateDayPlanInFirestore(day, (currentDayPlan) => {
      const newMeal: Meal = { id: `meal-${self.crypto.randomUUID()}`, title: 'Nueva Comida', recipes: [] };
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
    handleAddMeal,
    handleDeleteMeal,
    handleUpdateServingsEaten,
  };
}
