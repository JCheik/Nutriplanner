'use client';

import { useCallback } from 'react';
import type { WeekPlan, Recipe, GoalMacros, GoalType, Meal, DayPlan } from '@/lib/types';
import { DAY_ORDER } from '@/lib/data';
import { normalizeText } from '@/lib/utils';
import { mealCalorieRatio, suggestedServings } from '@/lib/serving-utils';
import { ASSISTANT_ACTIONS, type AssistantActionName } from '@/lib/assistant-actions';

export interface AssistantExecResult {
  ok: boolean;
  /** User-facing message: a result, an error, or a confirmation prompt. */
  message: string;
  /** True when a destructive action is awaiting confirmation before applying. */
  needsConfirmation?: boolean;
}

interface AssistantContext {
  weekPlan: WeekPlan;
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  activeGoalMacros: GoalMacros | null;
  onDrop: (day: string, mealId: string, recipe: Recipe, servings?: number) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onClearDay: (day: string) => void;
  onClearWeek: () => void;
  onAutocomplete: () => void;
  onSetGoal: (goal: GoalType) => void;
}

const GOAL_LABEL: Record<GoalType, string> = {
  loss: 'Perder peso',
  maintenance: 'Mantenimiento',
  gain: 'Ganar músculo',
  custom: 'Personalizado',
};

export function useAssistantActions(ctx: AssistantContext) {
  const resolveDay = useCallback((name: string): DayPlan | null => {
    const n = normalizeText(name);
    const dayName = DAY_ORDER.find(d => normalizeText(d) === n || normalizeText(d).startsWith(n));
    if (!dayName) return null;
    return ctx.weekPlan.find(d => d.day === dayName) ?? null;
  }, [ctx.weekPlan]);

  const resolveMeal = useCallback((dayPlan: DayPlan, mealName: string): Meal | null => {
    const n = normalizeText(mealName);
    // First by title, then by meal type label/value.
    return (
      dayPlan.meals.find(m => normalizeText(m.title) === n) ??
      dayPlan.meals.find(m => normalizeText(m.title).includes(n)) ??
      dayPlan.meals.find(m => (m.mealTypes ?? []).some(t => normalizeText(t) === n)) ??
      null
    );
  }, []);

  const resolveRecipe = useCallback((name: string): Recipe | null => {
    const n = normalizeText(name);
    const all = [...ctx.userRecipes, ...ctx.nutriplannerRecipes];
    return (
      all.find(r => normalizeText(r.name) === n) ??
      all.find(r => normalizeText(r.name).includes(n)) ??
      null
    );
  }, [ctx.userRecipes, ctx.nutriplannerRecipes]);

  const execute = useCallback((
    name: AssistantActionName,
    rawArgs: unknown,
    confirmed = false
  ): AssistantExecResult => {
    const def = ASSISTANT_ACTIONS[name];
    const parsed = def.schema.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      return { ok: false, message: 'No entendí bien los datos de esa acción. ¿Puedes repetirla?' };
    }
    const args = parsed.data as Record<string, string>;

    // Destructive actions require explicit confirmation before applying.
    if (def.destructive && !confirmed) {
      return { ok: false, needsConfirmation: true, message: confirmationPrompt(name, args) };
    }

    switch (name) {
      case 'add_recipe_to_meal': {
        const dayPlan = resolveDay(args.day);
        if (!dayPlan) return { ok: false, message: `No encontré el día "${args.day}".` };
        const meal = resolveMeal(dayPlan, args.meal);
        if (!meal) return { ok: false, message: `No encontré la comida "${args.meal}" en ${dayPlan.day}.` };
        const recipe = resolveRecipe(args.recipe);
        if (!recipe) return { ok: false, message: `No encontré la receta "${args.recipe}".` };
        const target = ctx.activeGoalMacros
          ? ctx.activeGoalMacros.calories * mealCalorieRatio(meal.mealTypes ?? [])
          : null;
        ctx.onDrop(dayPlan.day, meal.id, recipe, suggestedServings(recipe, target));
        return { ok: true, message: `Añadí "${recipe.name}" a ${meal.title} del ${dayPlan.day}.` };
      }
      case 'clear_meal': {
        const dayPlan = resolveDay(args.day);
        if (!dayPlan) return { ok: false, message: `No encontré el día "${args.day}".` };
        const meal = resolveMeal(dayPlan, args.meal);
        if (!meal) return { ok: false, message: `No encontré la comida "${args.meal}" en ${dayPlan.day}.` };
        ctx.onClearMeal(dayPlan.day, meal.id);
        return { ok: true, message: `Vacié ${meal.title} del ${dayPlan.day}.` };
      }
      case 'clear_day': {
        const dayPlan = resolveDay(args.day);
        if (!dayPlan) return { ok: false, message: `No encontré el día "${args.day}".` };
        ctx.onClearDay(dayPlan.day);
        return { ok: true, message: `Vacié todas las comidas del ${dayPlan.day}.` };
      }
      case 'clear_week': {
        ctx.onClearWeek();
        return { ok: true, message: 'Vacié todo el plan semanal.' };
      }
      case 'autocomplete_week': {
        ctx.onAutocomplete();
        return { ok: true, message: 'Abriendo el autocompletado del plan.' };
      }
      case 'set_goal': {
        const goal = args.goal as GoalType;
        ctx.onSetGoal(goal);
        return { ok: true, message: `Objetivo cambiado a "${GOAL_LABEL[goal]}".` };
      }
      default:
        return { ok: false, message: 'Acción no reconocida.' };
    }
  }, [ctx, resolveDay, resolveMeal, resolveRecipe]);

  return { execute };
}

function confirmationPrompt(name: AssistantActionName, args: Record<string, string>): string {
  switch (name) {
    case 'clear_meal':
      return `¿Seguro que quieres vaciar ${args.meal} del ${args.day}?`;
    case 'clear_day':
      return `¿Seguro que quieres vaciar todas las comidas del ${args.day}?`;
    case 'clear_week':
      return '¿Seguro que quieres vaciar TODO el plan semanal?';
    default:
      return '¿Confirmas esta acción?';
  }
}
