import { askAssistant } from '@/ai/flows/assistant-flow';
import type { InterviewForPrompt } from '@/ai/prompt-fragments';
import { corsPreflight, runAiEndpoint } from '../_shared';

interface Body {
  message: string;
  context: string;
  interview?: InterviewForPrompt;
}

export const OPTIONS = corsPreflight;

export function POST(req: Request) {
  return runAiEndpoint<Body>(
    req,
    (body) => askAssistant({ message: body.message, context: body.context, interview: body.interview }),
    'No se pudo procesar tu mensaje. Inténtalo de nuevo.'
  );
}
