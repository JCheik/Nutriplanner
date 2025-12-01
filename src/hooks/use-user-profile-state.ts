'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  const handleNoteSave = useCallback((content: string) => {
    if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { stickyNote: content });
    }
  }, [userProfileRef]);

  const handleCalorieResultSave = useCallback((result: CalculationResult) => {
    if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { calorieResult: result });
    }
  }, [userProfileRef]);

  const handleActiveGoalChange = (goal: GoalType) => {
    setActiveGoal(goal);
    if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { activeGoalPreference: goal });
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
  
  const handleShoppingListUpdate = useCallback((list: ShoppingListItem[]) => {
    if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { shoppingList: list });
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
