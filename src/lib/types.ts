export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BaseIngredient extends Macros {
  id: string;
  name: string;
  // per 100g or 100ml
  fiber: number;
  createdBy: string;
}

export interface Ingredient extends Macros {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Folder {
  id: string;
  name: string;
  userId: string;
}

export interface GlobalFolder {
  id: string;
  name: string;
}

export interface Recipe extends Macros {
  id: string;
  name: string;
  description: string;
  instructions: string;
  ingredients: Ingredient[];
  imageUrl?: string;
  imageHint?: string;
  folderId?: string;
}

export interface RecipeInstance extends Recipe {
  instanceId: string;
}

export interface Meal {
  id: string;
  title: string;
  recipes: RecipeInstance[];
}

export interface DayPlan {
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  meals: Meal[];
}

export type WeekPlan = DayPlan[];

export interface DailyTotal {
  day: string;
  totals: Macros;
}

export type DialogState = 
  | { open: false }
  | { open: true; mode: 'create', isNutriPlannerRecipe?: false }
  | { open: true; mode: 'view' | 'edit'; recipe: Recipe; isNutriPlannerRecipe?: boolean };

export type SortCriteria = 
  | 'name-asc' | 'name-desc'
  | 'calories-asc' | 'calories-desc'
  | 'protein-asc' | 'protein-desc'
  | 'carbs-asc' | 'carbs-desc'
  | 'fat-asc' | 'fat-desc';


// Types for Calorie Calculator
export interface GoalMacros extends Macros {
  // Protein, Carbs, Fat in grams are already in Macros
}

export type GoalType = 'loss' | 'maintenance' | 'gain' | 'custom';

export interface CalculationResult {
  bmr: number;
  maintenance: GoalMacros;
  loss: GoalMacros;
  gain: GoalMacros;
  custom?: GoalMacros;
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  stickyNote?: string;
  calorieResult?: CalculationResult;
  activeGoalPreference?: GoalType;
}


export interface UserClaims {
  admin?: boolean;
  // Add other custom claims here
}

export interface ActiveDropTarget {
  day: string;
  mealId: string;
}
