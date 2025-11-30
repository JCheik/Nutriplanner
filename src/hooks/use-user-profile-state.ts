'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { UserProfile, CalculationResult, GoalType, ShoppingListItem } from '@/lib/types';

interface UseUserProfileStateProps {
  isGuestMode?: boolean;
}

export function useUserProfileState({ isGuestMode = false }: UseUserProfileStateProps = {}) {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // --- Guest State ---
  const [guestStickyNote, setGuestStickyNote] = useState('¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.');
  const [guestCalorieResult, setGuestCalorieResult] = useState<CalculationResult | null>(null);
  const [guestShoppingList, setGuestShoppingList] = useState<ShoppingListItem[]>([]);

  // --- Firestore Data ---
  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // --- UI State ---
  const [activeGoal, setActiveGoal] = useState<GoalType>('maintenance');

  useEffect(() => {
    if (!isGuestMode && userProfile?.activeGoalPreference) {
      setActiveGoal(userProfile.activeGoalPreference);
    } else {
      setActiveGoal('maintenance');
    }
  }, [userProfile, isGuestMode]);

  // --- Memoized Data Sources ---
  const currentStickyNote = useMemo(() => isGuestMode ? guestStickyNote : (userProfile?.stickyNote || ''), [isGuestMode, guestStickyNote, userProfile]);
  const currentCalorieResult = useMemo(() => isGuestMode ? guestCalorieResult : (userProfile?.calorieResult || null), [isGuestMode, guestCalorieResult, userProfile]);
  const activeGoalMacros = useMemo(() => currentCalorieResult && activeGoal ? currentCalorieResult[activeGoal] : null, [currentCalorieResult, activeGoal]);
  const currentShoppingList = useMemo(() => isGuestMode ? guestShoppingList : (userProfile?.shoppingList || []), [isGuestMode, guestShoppingList, userProfile]);

  // --- Handlers ---
  const handleNoteSave = useCallback((content: string) => {
    if (isGuestMode) {
      setGuestStickyNote(content);
    } else if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { stickyNote: content });
    }
  }, [userProfileRef, isGuestMode]);

  const handleCalorieResultSave = useCallback((result: CalculationResult) => {
    if (isGuestMode) {
      setGuestCalorieResult(result);
    } else if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { calorieResult: result });
    }
  }, [userProfileRef, isGuestMode]);

  const handleActiveGoalChange = (goal: GoalType) => {
    setActiveGoal(goal);
    if (!isGuestMode && userProfileRef) {
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
    if (isGuestMode) {
      setGuestShoppingList(list);
    } else if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { shoppingList: list });
    }
  }, [userProfileRef, isGuestMode]);

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
