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
  // Optional brand (e.g. "Hacendado"). Shown separately from the name — like
  // Open Food Facts does — instead of being baked into the title. Together with
  // `name` it forms the ingredient's identity (see `ingredientKey`).
  brand?: string;
  // Optional natural unit so the food can be added by pieces instead of grams
  // (e.g. 1 loncha = 30 g, 1 yogur = 120 g). Macros are still stored per 100g;
  // this is only a convenience for entering/reading quantities.
  unitName?: string;   // e.g. "loncha", "yogur", "rebanada"
  unitWeight?: number; // grams in one such unit
  // per 100g or 100ml
  fiber: number;
  createdBy: string;
}

// An ingredient within a recipe no longer stores its own macros.
// It references a BaseIngredient via its name (+ optional brand).
const IngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  quantity: z.number(),
  // 'g'/'ml' → quantity is grams; any other unit is a piece count and
  // `unitWeight` (grams per piece) is snapshotted so macros stay correct.
  unit: z.string(),
  unitWeight: z.number().optional(),
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
  // Brand of a supermarket "product" recipe (e.g. "Hacendado"), shown apart
  // from the name — same convention as BaseIngredient.brand. Absent on
  // home-cooked recipes.
  brand: z.string().optional(),
  description: z.string(),
  instructions: z.string(),
  ingredients: z.array(IngredientSchema),
  imageUrl: z.string().optional(),
  imageHint: z.string().optional(),
  // Original source of the recipe (Instagram/TikTok/YouTube/blog…). Optional;
  // auto-filled on URL import and editable by hand. Shown as a link in the recipe view.
  sourceUrl: z.string().url().optional(),
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

// A saved snapshot of the whole week, for browsing/reusing past plans.
// Stored at users/{uid}/weekHistory/{id}. The planner itself stays a single
// rolling week; archiving copies the current 7 days into history on demand.
export interface WeekHistoryEntry {
  id: string;
  savedAt: number;
  label: string;
  days: DayPlan[];
}

export interface DailyTotal {
  day: string;
  totals: Macros;
}

export type DialogState =
  | { open: false }
  // `imageFile` carries an image captured at import time (a video frame or a
  // fetched og:image) into the editor, so it uploads on save like a manual pick.
  | { open: true; mode: 'create', recipe?: Partial<Recipe>; isNutriPlannerRecipe?: boolean; aiIngredients?: AiIngredientEstimate[]; imageFile?: File; }
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
  // Optional brand, shown apart from the name (same convention as ingredients).
  brand?: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

// ── Entrevista nutricional ("Mi Laboratorio") ────────────────────────────────
// Answers to the nutritionist-style interview. Stored on the user profile and
// fed to every AI flow (autocomplete, assistant, recipe generation) so plans
// respect real preferences instead of being generic.
export interface NutriInterview {
  /** Base diet style; mirrored into UserProfile.dietPreference on save so the
   * existing diet filter keeps working unchanged. */
  dietTags: DietTag[];
  /** Foods/dishes the user loves — the AI favours these. */
  favoriteFoods: string[];
  /** Foods the user dislikes/avoids — the AI never includes them. */
  avoidFoods: string[];
  /** Allergies/intolerances — ABSOLUTE prohibition, stronger than avoidFoods. */
  allergies: string[];
  /** Minimum dishes per week the user wants of each kind (0/absent = no wish). */
  weeklyWishes: {
    legumbres?: number;
    vegetariano?: number;
    pescado?: number;
  };
  /** 'variedad' = maximum variety; 'repetir' = batch-cooking friendly. */
  varietyPreference: 'variedad' | 'repetir';
  /** When varietyPreference === 'repetir': how many times a dish can repeat
   * across the week (2–7) before the AI should stop reusing it. */
  maxRepeatsPerRecipe?: number;
  /** Prefer quick dishes (<20 min) on weekdays. */
  quickWeekdays: boolean;
  /** "Comidas libres" per week (0–3): meals the user plans to eat off-plan.
   * Deliberately NOT called "cheat meals" anywhere user-facing — flexibility
   * is part of the plan, not cheating on it. The autocomplete still fills
   * every slot but biases slightly under target to leave weekly slack. */
  freeMealsPerWeek?: number;
  /** ISO date of the last time the interview was saved. */
  updatedAt: string;
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
  nutriInterview?: NutriInterview;
  // Per-feature onboarding state: key = guide id, value = true once dismissed forever.
  onboardingFlags?: Record<string, boolean>;
}


// ── Food diary ────────────────────────────────────────────────────────────────
// What the user ACTUALLY ate, as opposed to the forward-looking week plan.
// One document per calendar day at users/{uid}/diary/{YYYY-MM-DD}.

export type DiaryEntrySource = 'plan' | 'off' | 'manual';

export interface DiaryEntry extends Macros {
  id: string;
  name: string;
  /** Human-readable amount, e.g. "1 ración", "150 g". */
  quantityLabel?: string;
  /** Where the entry came from: the week plan, Open Food Facts, or manual. */
  source: DiaryEntrySource;
  /** For plan entries: the RecipeInstance.instanceId that was marked as eaten,
   * so the planner can show/toggle the "comido" state of each planned recipe. */
  planInstanceId?: string;
  /** Epoch millis when the entry was logged. */
  loggedAt: number;
}

export interface DiaryDay {
  /** YYYY-MM-DD — also the document id. */
  date: string;
  entries: DiaryEntry[];
  /** Optional morning weigh-in for the progress chart. */
  weightKg?: number;
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
  | 'empty-fridge'
  | 'recipe-import'
  | 'assistant'
  | 'history';
