'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, CalculationResult, GoalType, ShoppingListItem, DietTag } from '@/lib/types';

export function useUserProfileState() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

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
  const currentCalorieResult = useMemo(() => userProfile?.calorieResult || null, [userProfile]);
  const activeGoalMacros = useMemo(() => currentCalorieResult && activeGoal ? currentCalorieResult[activeGoal] : null, [currentCalorieResult, activeGoal]);
  const currentShoppingList = useMemo(() => userProfile?.shoppingList || [], [userProfile]);
  const currentDietPreference = useMemo(() => userProfile?.dietPreference || [], [userProfile]);

  // --- Handlers ---
  // NOTE: we use setDoc(..., { merge: true }) instead of updateDoc everywhere so
  // these writes also succeed for a brand-new user whose profile document hasn't
  // been created yet (updateDoc throws "No document to update" in that case).
  const handleCalorieResultSave = useCallback(async (result: CalculationResult) => {
    if (!userProfileRef) return;
    try {
      await setDoc(userProfileRef, { calorieResult: result }, { merge: true });
      toast({ title: 'Objetivos guardados', description: 'Tus metas de calorías y macros se han actualizado.' });
    } catch (e: any) {
      console.error("Error saving calorie result", e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar tus objetivos.' });
    }
  }, [userProfileRef, toast]);

  const handleActiveGoalChange = async (goal: GoalType) => {
    setActiveGoal(goal);
    if (userProfileRef) {
      try {
        await setDoc(userProfileRef, { activeGoalPreference: goal }, { merge: true });
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
      // Keep the calculator inputs so the "Editar" form stays pre-filled.
      // (Conditional spread avoids writing `undefined`, which Firestore rejects.)
      ...(currentCalorieResult?.inputs ? { inputs: currentCalorieResult.inputs } : {}),
    };
    handleCalorieResultSave(newResult);
  };
  
  const handleShoppingListUpdate = useCallback(async (list: ShoppingListItem[]) => {
    if (userProfileRef) {
      try {
        await setDoc(userProfileRef, { shoppingList: list }, { merge: true });
      } catch(e) { console.error("Error saving shopping list", e) }
    }
  }, [userProfileRef]);

  const handleDietPreferenceChange = useCallback(async (diets: DietTag[]) => {
    if (userProfileRef) {
      try {
        await setDoc(userProfileRef, { dietPreference: diets }, { merge: true });
      } catch(e) { console.error("Error saving diet preference", e) }
    }
  }, [userProfileRef]);

  return {
    currentCalorieResult,
    activeGoalMacros,
    currentShoppingList,
    currentDietPreference,
    activeGoal,
    handleCalorieResultSave,
    handleActiveGoalChange,
    handleSaveCustomGoal,
    handleShoppingListUpdate,
    handleDietPreferenceChange,
  };
}
