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
  /**
   * Parte de los macros del lote que NO crece al redimensionar el plato: el
   * aceite, la sal y las especias (ver `portion-scaling.ts`). Se calcula al
   * guardar y se guarda para no tener que resolver el catálogo de ingredientes
   * en cada pantalla que enseña un número.
   *
   * Opcional: las recetas anteriores al rediseño de raciones no lo tienen y
   * escalan linealmente, que es lo que hacían antes.
   */
  fixedMacros: MacrosSchema.optional(),
  /**
   * De dónde sale la receta. `'nutrilp'` = recetario del catálogo, escrito para
   * la persona de referencia (`REFERENCE_DAILY_KCAL`) y por tanto redimensionable
   * al tamaño de quien la mira. Ausente = del usuario (propia o importada), y
   * esas ya SON sus porciones: redimensionarlas sería cambiar lo que escribió.
   *
   * Se marca al leer la colección global, y viaja al plan porque la instancia
   * planificada es una copia sin más rastro de su procedencia.
   */
  origin: z.literal('nutrilp').optional(),
  // Meal categories this recipe fits. Empty/undefined = "comodín" (any meal).
  category: z.array(z.enum(MEAL_CATEGORY_ENUM)).optional(),
  // Diet tags this recipe satisfies. Empty/undefined = no dietary restriction.
  dietTags: z.array(z.enum(DIET_TAG_ENUM)).optional(),
  /**
   * Cuándo se creó, en ISO. Se pone SOLO al crear, nunca al editar: sirve para
   * encontrar "la que acabo de importar" entre las demás, y una receta que
   * retocas no vuelve a ser nueva.
   *
   * Opcional porque las recetas anteriores a esto no lo tienen. Ordenar por
   * recientes las manda al final, que es justo donde deben ir.
   */
  createdAt: z.string().optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;


/**
 * Una receta colocada en un hueco del plan. Copia de la receta más DOS números,
 * y cada uno hace un trabajo distinto — antes había uno solo (`servingsEaten`)
 * haciendo los dos a la vez, y por eso no hacía bien ninguno:
 *
 * - `plates`: cuántos platos comes. Entero. Es lo único que toca el usuario, y
 *   equivale a poner el mismo plato dos veces.
 * - `portion`: cómo de grande es UN plato para ti. Continuo, automático, sale
 *   del objetivo (`portionFactorFromGoal`). El usuario no lo teclea.
 *
 *     macros = (totales / servings) × portion × plates
 *
 * Los dos son opcionales por compatibilidad: las instancias guardadas antes del
 * rediseño solo tienen `servingsEaten`, y se leen como `plates = 1` +
 * `portion = servingsEaten`, que da exactamente el mismo número que antes.
 * Usa siempre `instancePlates`/`instancePortion` (`serving-utils.ts`) para
 * leerlos, nunca los campos a pelo.
 */
export interface RecipeInstance extends Recipe {
  instanceId: string;
  plates?: number;
  portion?: number;
  /**
   * @deprecated Anterior al rediseño de raciones. Se sigue LEYENDO para no
   * cambiarle el plan a nadie, pero no se escribe en instancias nuevas.
   */
  servingsEaten?: number;
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

/**
 * Reporte enviado desde la app ("Contar un problema"). Se lee solo desde
 * `/admin/feedback`. El contexto (versión, móvil, pantalla) lo rellena la app
 * sola: sin eso, los reportes llegan como "no me funciona" y no hay por dónde
 * empezar.
 */
export interface FeedbackEntry {
  id: string;
  uid: string;
  email: string;
  name: string;
  message: string;
  /** Versión de la app desde la que se envió (p. ej. "0.4.0"). */
  appVersion: string;
  /** Móvil y sistema, p. ej. "Android 14 · Pixel 7". */
  device: string;
  /** Ruta desde la que se abrió el formulario, si se sabe. */
  screen?: string;
  createdAt: number;
  /** Lo marca el admin al haberlo revisado. */
  handled?: boolean;
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
  | 'createdAt-desc'
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
  /** De dónde salen las recetas al autocompletar: 'mias' usa solo las del
   * usuario; 'todas' (por defecto) añade el recetario de Nutrilp. Ausente
   * equivale a 'todas', que es como se comportaba antes de existir el campo. */
  recipeSource?: 'mias' | 'todas';
  /**
   * Platos concretos que el usuario quiere ver sí o sí, y cuántas veces por
   * semana. Es el paso siguiente a `weeklyWishes`, que solo entiende de
   * categorías ("3 de legumbres"): aquí se pide un PLATO. Se guarda el nombre
   * junto al id para que la IA lo lea sin resolver nada y para que la lista
   * siga teniendo sentido si la receta desaparece.
   */
  favoriteRecipes?: { recipeId: string; name: string; perWeek: number }[];
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
  /**
   * Tamaño de plato del usuario, como multiplicador sobre el recetario de
   * Nutrilp (escrito para `REFERENCE_DAILY_KCAL`). Solo está presente si el
   * usuario lo ha ajustado a mano; lo normal es que falte y se calcule del
   * objetivo con `portionFactorFromGoal`, para que no haya dos verdades cuando
   * cambie de objetivo.
   */
  portionFactor?: number;
  // Per-feature onboarding state: key = guide id, value = true once dismissed forever.
  onboardingFlags?: Record<string, boolean>;
  /**
   * Recordatorios que el usuario ha escrito ("descongela el pollo"). Las
   * notificaciones son LOCALES —solo existen en el móvil que las programó—, así
   * que el texto se guarda aquí para poder reprogramarlas al reinstalar o al
   * cambiar de teléfono. Solo las usa la app; la web las ignora.
   */
  reminders?: {
    id: string;
    text: string;
    hour: number;
    minute: number;
    repeat: 'diario' | 'semanal';
    weekday?: number;
    enabled: boolean;
  }[];
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
