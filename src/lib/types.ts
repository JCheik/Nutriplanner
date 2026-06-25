import { z } from 'zod';

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

// An ingredient within a recipe no longer stores its own macros.
// It references a BaseIngredient via its name.
const IngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;


// Meal categories that tag recipes and plan slots. Used only as a GUIDE for the
// AI autocomplete; manual assignment is never restricted. Keep in sync with
// MEAL_CATEGORIES in src/lib/constants.ts.
export const MEAL_CATEGORY_ENUM = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack', 'postre', 'otro'] as const;
export type MealCategory = typeof MEAL_CATEGORY_ENUM[number];

// Diet tags a recipe can satisfy. Guide for the AI; empty = no restriction.
// Keep in sync with DIET_TAGS in src/lib/constants.ts.
export const DIET_TAG_ENUM = ['omnivora', 'vegetariana', 'vegana', 'keto', 'low_carb', 'sin_gluten', 'sin_lactosa'] as const;
export type DietTag = typeof DIET_TAG_ENUM[number];

const MacrosSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export const RecipeSchema = MacrosSchema.extend({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  ingredients: z.array(IngredientSchema),
  imageUrl: z.string().optional(),
  imageHint: z.string().optional(),
  servings: z.number().min(1).optional(),
  // Meal categories this recipe fits. Empty/undefined = "comodín" (any meal).
  category: z.array(z.enum(MEAL_CATEGORY_ENUM)).optional(),
  // Diet tags this recipe satisfies. Empty/undefined = no dietary restriction.
  dietTags: z.array(z.enum(DIET_TAG_ENUM)).optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;


export interface RecipeInstance extends Recipe {
  instanceId: string;
  servingsEaten: number;
}

// Per-100g nutritional estimate the AI attaches to a recipe ingredient that may
// not yet exist in the user's ingredient DB. Lets the recipe dialog offer to add
// the new ingredients (same UX as URL import). Not persisted on the Recipe.
export interface AiIngredientEstimate {
  name: string;
  // per 100g / 100ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  // The model corrected an implausible estimate against its references.
  corrected?: boolean;
  note?: string;
}

export interface Meal {
  id: string;
  title: string;
  recipes: RecipeInstance[];
  // Meal types this slot accepts. Drives the AI autocomplete (union of all types
  // + comodín recipes). Undefined/empty on legacy slots (inferred from title).
  mealTypes?: MealCategory[];
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
  | { open: true; mode: 'create', recipe?: Partial<Recipe>; isNutriPlannerRecipe?: boolean; aiIngredients?: AiIngredientEstimate[]; }
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

export interface CalculatorInputs {
  gender: 'male' | 'female';
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
}

export interface CalculationResult {
  bmr: number;
  maintenance: GoalMacros;
  loss: GoalMacros;
  gain: GoalMacros;
  custom?: GoalMacros;
  inputs?: CalculatorInputs;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  stickyNote?: string;
  calorieResult?: CalculationResult;
  activeGoalPreference?: GoalType;
  shoppingList?: ShoppingListItem[];
  dietPreference?: DietTag[];
  // Per-feature onboarding state: key = guide id, value = true once dismissed forever.
  onboardingFlags?: Record<string, boolean>;
}


export interface UserClaims {
  admin?: boolean;
  // This is where the superuser email check goes
  email?: string;
}

export interface ActiveDropTarget {
  day: string;
  mealId: string;
}

export type PanelType =
  | 'goals'
  | 'shopping-list'
  | 'sticky-note'
  | 'empty-fridge'
  | 'recipe-import'
  | 'assistant';
