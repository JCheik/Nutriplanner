import { generateRecipe, type GenerateRecipeInput } from '@/ai/flows/generate-recipe-flow';
import { corsPreflight, runAiEndpoint } from '../_shared';

export const OPTIONS = corsPreflight;

export function POST(req: Request) {
  return runAiEndpoint<GenerateRecipeInput>(
    req,
    (body) => generateRecipe(body),
    'No se pudo generar la receta. Inténtalo de nuevo.'
  );
}
