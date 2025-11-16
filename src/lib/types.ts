export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Ingredient extends Macros {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe extends Macros {
  id: string;
  name: string;
  description: string;
  instructions: string;
  ingredients: Ingredient[];
  imageUrl?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface Meal {
  id: string;
  recipe: Recipe | null;
}

export interface DayPlan {
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  meals: Record<MealType, Meal>;
}

export type WeekPlan = DayPlan[];

export interface DailyTotal {
  day: string;
  totals: Macros;
}

export type DialogState = 
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'view' | 'edit'; recipe: Recipe };
