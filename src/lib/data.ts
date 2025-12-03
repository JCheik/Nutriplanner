'use client';
import type { Recipe, WeekPlan, Meal, DayPlan, Ingredient } from './types';

export const NUTRIPLANNER_RECIPES_DATA: Recipe[] = [];

const defaultMeals: Omit<Meal, 'id'>[] = [
  { title: 'Desayuno', recipes: [] },
  { title: 'Almuerzo', recipes: [] },
  { title: 'Merienda', recipes: [] },
  { title: 'Cena', recipes: [] },
];

const createDayPlan = (day: DayPlan['day']): DayPlan => ({
    day,
    meals: defaultMeals.map((meal, index) => ({ 
        ...meal, 
        id: `m-${index}-${day.toLowerCase()}`, // Ensure unique ID for each meal slot
        recipes: [] 
    })),
});

export const DAY_ORDER: DayPlan['day'][] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const INITIAL_WEEK_PLAN: WeekPlan = DAY_ORDER.map(createDayPlan);
