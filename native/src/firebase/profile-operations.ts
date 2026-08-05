import { doc, setDoc } from 'firebase/firestore';

import { firestore } from '@/firebase';
import type { CalculationResult, GoalType, NutriInterview, UserProfile } from '@/lib/types';

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
 * Guarda los recordatorios. Las notificaciones en sí las programa el móvil
 * (`lib/reminders.ts`); esto es la copia que permite recuperarlas al
 * reinstalar o al cambiar de teléfono.
 */
export function saveReminders(userId: string, reminders: UserProfile['reminders']) {
  return setDoc(doc(firestore, 'users', userId), { reminders: reminders ?? [] }, { merge: true });
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
