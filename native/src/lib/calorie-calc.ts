// Copiado de la web (components/nutri-planner/calculator-dialog.tsx) — la misma
// fórmula y los mismos repartos, para que el objetivo salga idéntico se calcule
// donde se calcule. Mantener en sincronía.
import type { CalculationResult, CalculatorInputs, GoalMacros } from './types';

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
} as const;

export const ACTIVITY_LABELS: Record<CalculatorInputs['activityLevel'], string> = {
  sedentary: 'Sedentario (poco o nada de ejercicio)',
  light: 'Ligero (1-3 días por semana)',
  moderate: 'Moderado (3-5 días por semana)',
  very: 'Alto (6-7 días por semana)',
  extra: 'Muy alto (trabajo físico o 2 sesiones/día)',
};

export const GOAL_LABELS: Record<'loss' | 'maintenance' | 'gain', string> = {
  loss: 'Perder grasa',
  maintenance: 'Mantenimiento',
  gain: 'Ganar músculo',
};

function calculateMacros(calories: number, weight: number): GoalMacros {
  // Proteína: 2,2 g por kg de peso corporal.
  const proteinGrams = Math.round(weight * 2.2);
  const proteinCalories = proteinGrams * 4;
  // Grasa: 25 % de las calorías totales.
  const fatCalories = calories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);
  // Carbohidratos: lo que queda.
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbGrams = Math.max(0, Math.round(carbCalories / 4));

  return {
    calories: Math.round(calories),
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams,
  };
}

/** Mifflin-St Jeor + multiplicador de actividad; -20 % perder, +10 % ganar. */
export function computeResult(inputs: CalculatorInputs, previousCustom?: GoalMacros): CalculationResult {
  const { gender, age, weight, height, activityLevel } = inputs;

  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const maintenanceCalories = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  return {
    bmr: Math.round(bmr),
    maintenance: calculateMacros(maintenanceCalories, weight),
    loss: calculateMacros(maintenanceCalories * 0.8, weight),
    gain: calculateMacros(maintenanceCalories * 1.1, weight),
    inputs,
    // Conserva un objetivo personalizado previo para no borrarlo al recalcular.
    ...(previousCustom ? { custom: previousCustom } : {}),
  };
}
