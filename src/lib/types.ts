import { MessageData } from 'genkit';
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


export interface Folder {
  id: string;
  name: string;
  userId: string;
}

export interface GlobalFolder {
  id: string;
  name: string;
}

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
  folderId: z.string().nullable().optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;


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
  | { open: true; mode: 'create', recipe?: Partial<Recipe>; isNutriPlannerRecipe?: false; }
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


// Types for Recipe Chat Flow
export const RecipeChatInputSchema = z.object({
  history: z.array(z.custom<MessageData>()),
  message: z.string(),
  generateThree: z.boolean().optional(),
  nutritionalGoal: MacrosSchema.optional(),
});
export type RecipeChatInput = z.infer<typeof RecipeChatInputSchema>;

export const RecipeChatOutputSchema = z.string();
export type RecipeChatOutput = z.infer<typeof RecipeChatOutputSchema>;
