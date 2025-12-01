'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { INITIAL_WEEK_PLAN, DAY_ORDER } from '@/lib/data';
import type { WeekPlan, Recipe, Meal, DayPlan, RecipeInstance } from '@/lib/types';

// --- Helper Functions ---
const addRecipeToMeal = (plan: WeekPlan, day: string, mealId: string, recipe: Recipe): WeekPlan => {
  const newRecipeInstance: RecipeInstance = { ...recipe, instanceId: self.crypto.randomUUID() };
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

  // --- Helper for Firestore Day Updates ---
  const updateDayPlanInFirestore = useCallback((day: string, updatedDayData: DayPlan) => {
    if (!user || !firestore) return;
    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    setDocumentNonBlocking(dayDocRef, updatedDayData, { merge: true });
  }, [user, firestore]);

  // --- Handlers ---
  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    const planToUpdate = currentWeekPlan;
    const updatedPlan = addRecipeToMeal(planToUpdate, day, mealId, droppedRecipe);
    const updatedDay = updatedPlan.find(d => d.day === day);

    if (updatedDay) {
      updateDayPlanInFirestore(day, updatedDay);
    }
  }, [currentWeekPlan, updateDayPlanInFirestore]);
  
  const handleClearMeal = useCallback((day: string, mealId: string) => {
    const updatedPlan = clearMealRecipes(currentWeekPlan, day, mealId);
    const updatedDay = updatedPlan.find(d => d.day === day);
    if (updatedDay) {
      updateDayPlanInFirestore(day, updatedDay);
    }
  }, [currentWeekPlan, updateDayPlanInFirestore]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeInstanceId: string) => {
    const updatedPlan = removeRecipeFromMeal(currentWeekPlan, day, mealId, recipeInstanceId);
    const updatedDay = updatedPlan.find(d => d.day === day);
    if (updatedDay) {
      updateDayPlanInFirestore(day, updatedDay);
    }
  }, [currentWeekPlan, updateDayPlanInFirestore]);

  const handleUpdateMealTitle = useCallback((day: string, mealId: string, newTitle: string) => {
    if (!user || !firestore) return;
    const targetDay = currentWeekPlan.find(d => d.day === day);
    if (targetDay) {
      const updatedMeals = targetDay.meals.map(meal => meal.id === mealId ? { ...meal, title: newTitle } : meal);
      updateDayPlanInFirestore(day, { ...targetDay, meals: updatedMeals });
    }
  }, [user, firestore, currentWeekPlan, updateDayPlanInFirestore]);

  const handleAddMeal = useCallback((day: string, index: number) => {
    if (!user || !firestore) return;
    const targetDay = currentWeekPlan.find(d => d.day === day);
    if (targetDay) {
      const newMeal: Meal = { id: `meal-${self.crypto.randomUUID()}`, title: 'Nueva Comida', recipes: [] };
      const updatedMeals = [...targetDay.meals];
      updatedMeals.splice(index, 0, newMeal);
      updateDayPlanInFirestore(day, { ...targetDay, meals: updatedMeals });
    }
  }, [user, firestore, currentWeekPlan, updateDayPlanInFirestore]);

  const handleDeleteMeal = useCallback((day: string, mealId: string) => {
    if (!user || !firestore) return;
    const targetDay = currentWeekPlan.find(d => d.day === day);
    if (targetDay) {
      const updatedMeals = targetDay.meals.filter(meal => meal.id !== mealId);
      updateDayPlanInFirestore(day, { ...targetDay, meals: updatedMeals });
    }
  }, [user, firestore, currentWeekPlan, updateDayPlanInFirestore]);

  return {
    currentWeekPlan,
    weekPlanLoading,
    handleDrop,
    handleClearMeal,
    handleRemoveRecipeFromMeal,
    handleUpdateMealTitle,
    handleAddMeal,
    handleDeleteMeal,
  };
}
