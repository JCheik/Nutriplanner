// Copiado de la web (src/lib/data.ts, sin 'use client') — mantener en sincronía.
import type { WeekPlan, Meal, DayPlan } from './types';

const defaultMeals: Omit<Meal, 'id'>[] = [
  { title: 'Desayuno', recipes: [], mealTypes: ['desayuno'] },
  { title: 'Almuerzo', recipes: [], mealTypes: ['almuerzo'] },
  { title: 'Merienda', recipes: [], mealTypes: ['merienda'] },
  { title: 'Cena', recipes: [], mealTypes: ['cena'] },
];

const createDayPlan = (day: DayPlan['day']): DayPlan => ({
  day,
  meals: defaultMeals.map((meal, index) => ({
    ...meal,
    id: `m-${index}-${day.toLowerCase()}`, // Ensure unique ID for each meal slot
    recipes: [],
  })),
});

export const DAY_ORDER: DayPlan['day'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const INITIAL_WEEK_PLAN: WeekPlan = DAY_ORDER.map(createDayPlan);
