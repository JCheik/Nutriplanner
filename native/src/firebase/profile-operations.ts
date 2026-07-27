import { doc, setDoc } from 'firebase/firestore';

import { firestore } from '@/firebase';
import type { CalculationResult, GoalType, NutriInterview } from '@/lib/types';

/**
 * Escrituras del perfil, con el mismo contrato que la web
 * (`use-user-profile-state.ts`): siempre `setDoc` con merge sobre el doc del
 * usuario, para no pisar el resto de campos.
 */

export function saveCalorieResult(userId: string, result: CalculationResult) {
  return setDoc(doc(firestore, 'users', userId), { calorieResult: result }, { merge: true });
}

export function saveActiveGoal(userId: string, goal: GoalType) {
  return setDoc(doc(firestore, 'users', userId), { activeGoalPreference: goal }, { merge: true });
}

/**
 * Guarda la entrevista y **espeja `dietTags` en `dietPreference`**, igual que
 * la web: el filtro de dieta de toda la app lee ese campo, así que si no se
 * copiara, cambiar la dieta en la entrevista no tendría efecto en el resto.
 */
export function saveNutriInterview(userId: string, interview: NutriInterview) {
  return setDoc(
    doc(firestore, 'users', userId),
    { nutriInterview: interview, dietPreference: interview.dietTags },
    { merge: true }
  );
}
