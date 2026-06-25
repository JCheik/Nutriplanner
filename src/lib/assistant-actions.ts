import { z } from 'zod';

/**
 * Catalog of actions the AI assistant can perform on the app. Shared by:
 *  - the server flow (to describe the tools to the model), and
 *  - the client executor (to validate args and run the matching handler).
 *
 * Each action declares a Zod `schema` for its arguments and whether it is
 * `destructive` (destructive actions require explicit user confirmation before
 * the executor applies them). Keep this module free of server/client-only
 * imports so both sides can use it.
 */
export const ASSISTANT_ACTIONS = {
  add_recipe_to_meal: {
    description: 'Añade una receta a una comida concreta de un día.',
    destructive: false,
    schema: z.object({
      day: z.string().describe('Día de la semana en español, p.ej. "Lunes"'),
      meal: z.string().describe('Nombre o tipo de la comida, p.ej. "Cena" o "Desayuno"'),
      recipe: z.string().describe('Nombre de la receta a añadir'),
    }),
  },
  clear_meal: {
    description: 'Vacía (quita todas las recetas de) una comida concreta de un día.',
    destructive: true,
    schema: z.object({
      day: z.string().describe('Día de la semana en español'),
      meal: z.string().describe('Nombre o tipo de la comida'),
    }),
  },
  clear_day: {
    description: 'Vacía todas las comidas de un día.',
    destructive: true,
    schema: z.object({
      day: z.string().describe('Día de la semana en español'),
    }),
  },
  clear_week: {
    description: 'Vacía por completo el plan semanal.',
    destructive: true,
    schema: z.object({}),
  },
  autocomplete_week: {
    description: 'Rellena automáticamente con IA los huecos vacíos del plan semanal.',
    destructive: false,
    schema: z.object({}),
  },
  set_goal: {
    description: 'Cambia el objetivo nutricional activo del usuario.',
    destructive: false,
    schema: z.object({
      goal: z.enum(['loss', 'maintenance', 'gain', 'custom']).describe(
        'loss = perder peso, maintenance = mantenimiento, gain = ganar músculo, custom = personalizado'
      ),
    }),
  },
  create_recipe: {
    description:
      'Crea una receta nueva a partir de lo que pide el usuario (ingredientes, tipo de comida, restricciones). Úsalo cuando pida inventar/crear/generar una receta. La app la mostrará para que la revise y la guarde.',
    destructive: false,
    schema: z.object({
      description: z
        .string()
        .describe('Qué receta quiere: ingredientes, tipo de comida, dieta, raciones, etc., en una frase.'),
    }),
  },
} as const;

export type AssistantActionName = keyof typeof ASSISTANT_ACTIONS;

export function isAssistantAction(name: string): name is AssistantActionName {
  return Object.prototype.hasOwnProperty.call(ASSISTANT_ACTIONS, name);
}

export function isDestructiveAction(name: AssistantActionName): boolean {
  return ASSISTANT_ACTIONS[name].destructive;
}

/** Human-readable summary of the catalog for prompting the model. */
export function describeActions(): string {
  return Object.entries(ASSISTANT_ACTIONS)
    .map(([name, def]) => {
      const shape = (def.schema as z.ZodObject<z.ZodRawShape>).shape;
      const params = Object.keys(shape).length
        ? Object.keys(shape).join(', ')
        : '(sin argumentos)';
      return `- ${name}: ${def.description} Args: ${params}`;
    })
    .join('\n');
}
