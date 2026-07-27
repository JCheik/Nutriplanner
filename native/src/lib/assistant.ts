import { DAY_ORDER } from './data';
import type { DayPlan, Meal, Recipe, WeekPlan } from './types';
import { normalizeText } from './utils';

/** Contexto que se manda al flow: días+comidas+recetas del usuario (como la web). */
export function buildContext(weekPlan: WeekPlan, userRecipes: Recipe[], globalRecipes: Recipe[]): string {
  const days = weekPlan
    .map(
      (d) =>
        `${d.day}: ` +
        d.meals
          .map((m) => `${m.title}${m.recipes.length ? ` (${m.recipes.map((r) => r.name).join(', ')})` : ' (vacío)'}`)
          .join(' | ')
    )
    .join('\n');
  const recipes = [...userRecipes, ...globalRecipes].map((r) => r.name).slice(0, 120).join(', ');
  return `DÍAS Y COMIDAS:\n${days}\n\nRECETAS DISPONIBLES:\n${recipes}`;
}

export function resolveDay(weekPlan: WeekPlan, name: string): DayPlan | null {
  const n = normalizeText(name);
  const dayName = DAY_ORDER.find((d) => normalizeText(d) === n || normalizeText(d).startsWith(n));
  return dayName ? weekPlan.find((d) => d.day === dayName) ?? null : null;
}

export function resolveMeal(dayPlan: DayPlan, mealName: string): Meal | null {
  const n = normalizeText(mealName);
  return (
    dayPlan.meals.find((m) => normalizeText(m.title) === n) ??
    dayPlan.meals.find((m) => normalizeText(m.title).includes(n)) ??
    dayPlan.meals.find((m) => (m.mealTypes ?? []).some((t) => normalizeText(t) === n)) ??
    null
  );
}

export function resolveRecipe(userRecipes: Recipe[], globalRecipes: Recipe[], name: string): Recipe | null {
  const n = normalizeText(name);
  const all = [...userRecipes, ...globalRecipes];
  return all.find((r) => normalizeText(r.name) === n) ?? all.find((r) => normalizeText(r.name).includes(n)) ?? null;
}

/** Acciones destructivas piden confirmación antes de aplicarse. */
export const DESTRUCTIVE_ACTIONS = new Set(['clear_meal', 'clear_day', 'clear_week']);

export function confirmationPrompt(action: string, args: Record<string, unknown>): string {
  switch (action) {
    case 'clear_meal':
      return `¿Te vacío ${args.meal} del ${args.day}?`;
    case 'clear_day':
      return `¿Seguro que quieres dejar el ${args.day} en blanco?`;
    case 'clear_week':
      return 'Ojo, esto borra TODO el plan de la semana. ¿Lo hago?';
    default:
      return '¿Lo confirmo?';
  }
}
