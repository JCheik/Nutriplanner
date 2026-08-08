import { normalizeText } from '@/lib/utils';
import type { Recipe, WeekPlan } from '@/lib/types';

/**
 * Buscar en el plan lo que el usuario quiere quitar ("no quiero tanto atún").
 *
 * Se mira el nombre de la receta Y sus ingredientes: "atún" no aparece en
 * "Tortitas de arroz con guacamole", pero sí en su lista de ingredientes, y es
 * justo el plato que el usuario quiere fuera.
 */
export function recipeMatchesQuery(recipe: Pick<Recipe, 'name' | 'ingredients'>, query: string): boolean {
  const q = normalizeText(query.trim());
  if (q.length < 2) return false;
  if (normalizeText(recipe.name).includes(q)) return true;
  return (recipe.ingredients ?? []).some((i) => normalizeText(i.name).includes(q));
}

export interface PlanMatch {
  day: string;
  mealId: string;
  mealTitle: string;
  instanceId: string;
  recipeId: string;
  name: string;
}

/** Todas las comidas del plan que encajan con la búsqueda, en orden de semana. */
export function findInPlan(weekPlan: WeekPlan, query: string): PlanMatch[] {
  const out: PlanMatch[] = [];
  weekPlan.forEach((dayPlan) =>
    (dayPlan.meals ?? []).forEach((meal) =>
      (meal.recipes ?? []).forEach((r) => {
        if (recipeMatchesQuery(r, query)) {
          out.push({
            day: dayPlan.day,
            mealId: meal.id,
            mealTitle: meal.title,
            instanceId: r.instanceId,
            recipeId: r.id,
            name: r.name,
          });
        }
      })
    )
  );
  return out;
}

/**
 * Cuáles se quitan y cuáles se quedan. Se conservan las PRIMERAS de la semana
 * para no dejar al usuario con el plato repetido justo al final.
 */
export function splitToRemove(matches: PlanMatch[], keepAtMost: number): { keep: PlanMatch[]; remove: PlanMatch[] } {
  const keep = matches.slice(0, Math.max(0, keepAtMost));
  return { keep, remove: matches.slice(keep.length) };
}
