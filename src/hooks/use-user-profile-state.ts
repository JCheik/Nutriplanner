'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile, CalculationResult, GoalType, ShoppingListItem } from '@/lib/types';

export function useUserProfileState() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // --- Firestore Data ---
  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // --- UI State ---
  const [activeGoal, setActiveGoal] = useState<GoalType>('maintenance');

  useEffect(() => {
    if (userProfile?.activeGoalPreference) {
      setActiveGoal(userProfile.activeGoalPreference);
    } else {
      setActiveGoal('maintenance');
    }
  }, [userProfile]);

  // --- Memoized Data Sources ---
  const currentStickyNote = useMemo(() => userProfile?.stickyNote || '', [userProfile]);
  const currentCalorieResult = useMemo(() => userProfile?.calorieResult || null, [userProfile]);
  const activeGoalMacros = useMemo(() => currentCalorieResult && activeGoal ? currentCalorieResult[activeGoal] : null, [currentCalorieResult, activeGoal]);
  const currentShoppingList = useMemo(() => userProfile?.shoppingList || [], [userProfile]);

  // --- Handlers ---
  const handleNoteSave = useCallback(async (content: string) => {
    if (userProfileRef) {
      try {
        await updateDoc(userProfileRef, { stickyNote: content });
      } catch(e) { console.error("Error saving sticky note", e) }
    }
  }, [userProfileRef]);

  const handleCalorieResultSave = useCallback(async (result: CalculationResult) => {
    if (userProfileRef) {
      try {
        await updateDoc(userProfileRef, { calorieResult: result });
      } catch(e) { console.error("Error saving calorie result", e) }
    }
  }, [userProfileRef]);

  const handleActiveGoalChange = async (goal: GoalType) => {
    setActiveGoal(goal);
    if (userProfileRef) {
      try {
        await updateDoc(userProfileRef, { activeGoalPreference: goal });
      } catch(e) { console.error("Error saving goal", e) }
    }
  };

  const handleSaveCustomGoal = (macros: { calories: number; protein: number; carbs: number; fat: number; }) => {
    const newResult: CalculationResult = {
      bmr: currentCalorieResult?.bmr || 0,
      maintenance: currentCalorieResult?.maintenance || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      loss: currentCalorieResult?.loss || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      gain: currentCalorieResult?.gain || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      custom: macros,
    };
    handleCalorieResultSave(newResult);
  };
  
  const handleShoppingListUpdate = useCallback(async (list: ShoppingListItem[]) => {
    if (userProfileRef) {
      try {
        await updateDoc(userProfileRef, { shoppingList: list });
      } catch(e) { console.error("Error saving shopping list", e) }
    }
  }, [userProfileRef]);

  return {
    currentStickyNote,
    currentCalorieResult,
    activeGoalMacros,
    currentShoppingList,
    activeGoal,
    handleNoteSave,
    handleCalorieResultSave,
    handleActiveGoalChange,
    handleSaveCustomGoal,
    handleShoppingListUpdate,
  };
}
