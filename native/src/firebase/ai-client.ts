import { auth } from '@/firebase';
import type { GoalMacros, NutriInterview } from '@/lib/types';

/**
 * Cliente de los endpoints de IA de la web (`/api/ai/*`). La app NO habla con
 * Gemini directamente: manda el ID token de Firebase y la web verifica, aplica
 * cuota y ejecuta el mismo flow Genkit. La clave nunca viaja aquí.
 */
const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://nutrilp.com').replace(/\/$/, '');

/** Subconjunto de la entrevista que consumen los flows (InterviewForPrompt). */
export interface InterviewForAi {
  favoriteFoods: string[];
  avoidFoods: string[];
  allergies: string[];
  weeklyWishes: { legumbres?: number; vegetariano?: number; pescado?: number };
  varietyPreference: 'variedad' | 'repetir';
  maxRepeatsPerRecipe?: number;
  quickWeekdays: boolean;
  freeMealsPerWeek?: number;
  favoriteRecipes?: { recipeId: string; name: string; perWeek: number }[];
}

/** Recorta el perfil guardado a lo que la IA usa (mismo criterio que la web). */
export function interviewForAi(interview: NutriInterview | undefined | null): InterviewForAi | undefined {
  if (!interview) return undefined;
  return {
    favoriteFoods: interview.favoriteFoods,
    avoidFoods: interview.avoidFoods,
    allergies: interview.allergies,
    weeklyWishes: interview.weeklyWishes,
    varietyPreference: interview.varietyPreference,
    ...(interview.maxRepeatsPerRecipe ? { maxRepeatsPerRecipe: interview.maxRepeatsPerRecipe } : {}),
    quickWeekdays: interview.quickWeekdays,
    ...(interview.freeMealsPerWeek ? { freeMealsPerWeek: interview.freeMealsPerWeek } : {}),
    ...(interview.favoriteRecipes?.length ? { favoriteRecipes: interview.favoriteRecipes } : {}),
  };
}

class AiError extends Error {}

async function postAi<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new AiError('Inicia sesión para usar la IA.');
  const token = await user.getIdToken();

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/ai/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiError('Sin conexión con el servidor. Revisa tu internet.');
  }

  let json: { result?: T; error?: string };
  try {
    json = (await res.json()) as { result?: T; error?: string };
  } catch {
    throw new AiError('Respuesta inesperada del servidor.');
  }
  if (!res.ok) throw new AiError(json.error ?? 'La IA falló. Inténtalo de nuevo.');
  return json.result as T;
}

export interface AssistantReply {
  reply: string;
  action: string | null;
  args: Record<string, unknown> | null;
}

export function askAssistant(input: { message: string; context: string; interview?: InterviewForAi }) {
  return postAi<AssistantReply>('assistant', input);
}

export interface AutocompletePreferences {
  allowRepetition: 'no_repeat' | 'max_n' | 'max_twice' | 'free';
  maxRepetitions?: number;
  priority: 'goal' | 'protein' | 'calories';
  dietaryRestrictions?: string;
  goalMarginPercent?: number;
  diet?: string[];
  interview?: InterviewForAi;
  recentRecipeNames?: string[];
}

export interface AutocompleteResult {
  placements: { day: string; mealId: string; recipeId: string; servings: number }[];
  /**
   * Huecos que el autocompletado dejó vacíos, cada uno con su motivo. La web los
   * agrupa y da un consejo distinto para cada uno (`lib/autocomplete-summary`);
   * aquí de momento solo se cuentan.
   */
  unfilled: {
    day: string;
    mealId: string;
    mealTitle: string;
    reason: 'sin_recetas' | 'tope_repeticion' | 'margen_calorico';
  }[];
}

export function autocompleteWeek(input: {
  weekPlan: unknown;
  availableRecipes: unknown;
  activeGoal: GoalMacros | null;
  preferences: AutocompletePreferences;
}) {
  return postAi<AutocompleteResult>('autocomplete', input);
}

/** Ingrediente generado por la IA: cantidad en la receta + estimación por 100 g. */
export interface GeneratedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  corrected: boolean;
  note?: string;
}

export interface GeneratedRecipe {
  name: string;
  description: string;
  instructions: string;
  ingredients: GeneratedIngredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageHint?: string;
  servings?: number;
  dietTags?: string[];
  category?: string[];
}

/**
 * Importar una receta desde un enlace de redes (lo que llega al compartir un
 * post de Instagram/TikTok con Nutrilp). El servidor lee la publicación y monta
 * la receta en una sola llamada; devuelve el mismo shape que `generateRecipe`,
 * así que la pantalla de revisión es la misma.
 */
export function importRecipeFromUrl(input: {
  url?: string;
  /** Texto pegado, cuando lo compartido no era un enlace. */
  text?: string;
  /**
   * Captura de pantalla, como data URL. Es el único camino que funciona con
   * Instagram: al enlace no se le puede sacar nada sin sesión iniciada.
   */
  imageBase64?: string;
  existingIngredients?: string[];
  /**
   * Con `jobId`, el servidor GUARDA la receta y deja constancia en
   * `users/{uid}/importJobs/{jobId}`. Es lo que hace que la importación
   * sobreviva a que Android mate la app: el resultado deja de vivir en esta
   * respuesta.
   */
  jobId?: string;
}) {
  return postAi<{
    recipe: GeneratedRecipe | null;
    imageUrl: string | null;
    source?: string;
    /**
     * `'nevera'` cuando la imagen compartida era comida sin receta. No es un
     * error: es la otra función de la app, y la decide la IA al mirar la foto.
     */
    kind?: 'nevera';
    /** Presente solo si se mandó `jobId`: la receta ya está guardada. */
    saved?: { recipeId: string; recipeName: string };
  }>('import-recipe', input);
}

export function generateRecipe(input: {
  description: string;
  nutritionalGoal?: GoalMacros | null;
  diet?: string[];
  existingIngredients?: string[];
  interview?: InterviewForAi;
}) {
  return postAi<GeneratedRecipe | null>('generate-recipe', input);
}

/** Receta que devuelve el escáner de nevera: shape de Recipe sin id ni imagen. */
export interface FridgeRecipe {
  name: string;
  description: string;
  instructions: string;
  ingredients: { id: string; name: string; brand?: string; quantity: number; unit: string }[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings?: number;
  category?: string[];
  dietTags?: string[];
}

export interface FridgeScanResult {
  ingredients: string[];
  recipes: FridgeRecipe[];
}

export function parseFridgeImage(input: {
  /** data URL: data:image/jpeg;base64,… */
  imageBase64: string;
  nutritionalGoal?: GoalMacros | null;
}) {
  return postAi<FridgeScanResult>('parse-fridge', input);
}
