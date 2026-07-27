import { parseFridgeImage } from '@/ai/flows/parse-fridge-image-flow';
import { corsPreflight, runAiEndpoint } from '../_shared';

interface Body {
  /** data URL: data:image/jpeg;base64,… */
  imageBase64: string;
  nutritionalGoal?: { calories: number; protein: number; carbs: number; fat: number } | null;
}

export const OPTIONS = corsPreflight;

export function POST(req: Request) {
  return runAiEndpoint<Body>(
    req,
    (body) => parseFridgeImage({ imageBase64: body.imageBase64, nutritionalGoal: body.nutritionalGoal }),
    'No se pudo analizar la foto. Inténtalo de nuevo.'
  );
}
