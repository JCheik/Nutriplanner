import { autocompleteWeek } from '@/ai/flows/autocomplete-flow';
import { corsPreflight, runAiEndpoint } from '../_shared';

// Loosely typed: the flow validates its own input with zod. The native app
// sends the same shape the web passes to autocompleteWeek().
interface Body {
  weekPlan: unknown;
  availableRecipes: unknown;
  activeGoal: unknown;
  preferences: Parameters<typeof autocompleteWeek>[0]['preferences'];
}

export const OPTIONS = corsPreflight;

export function POST(req: Request) {
  return runAiEndpoint<Body>(
    req,
    (body) =>
      autocompleteWeek({
        weekPlan: body.weekPlan,
        availableRecipes: body.availableRecipes,
        activeGoal: body.activeGoal,
        preferences: body.preferences,
      }),
    'No se pudo generar el plan semanal. Inténtalo de nuevo.'
  );
}
