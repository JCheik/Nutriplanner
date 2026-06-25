'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Send, LoaderCircle, Wand2, Mic, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { getAiErrorMessage, isRetryableAiError } from '@/lib/ai-error';
import { askAssistant } from '@/ai/flows/assistant-flow';
import { generateRecipe } from '@/ai/flows/generate-recipe-flow';
import {
  useAssistantActions,
  type AssistantExecResult,
} from '@/hooks/use-assistant-actions';
import { isAssistantAction } from '@/lib/assistant-actions';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import type { WeekPlan, Recipe, GoalMacros, GoalType, DietTag, AiIngredientEstimate } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface PendingAction {
  name: string;
  args: unknown;
  prompt: string;
}

interface AssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  weekPlan: WeekPlan;
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  activeGoalMacros: GoalMacros | null;
  dietPreference?: DietTag[];
  onDrop: (day: string, mealId: string, recipe: Recipe, servings?: number) => void;
  onClearMeal: (day: string, mealId: string) => void;
  onClearDay: (day: string) => void;
  onClearWeek: () => void;
  onAutocomplete: () => void;
  onSetGoal: (goal: GoalType) => void;
  /**
   * Hands a freshly generated recipe to the host so it can open the review
   * dialog. `aiIngredients` carries the per-100g estimates for the recipe's
   * ingredients so the dialog can offer to add the ones missing from the DB.
   */
  onCreateRecipe: (recipe: Omit<Recipe, 'id'>, aiIngredients?: AiIngredientEstimate[]) => void;
}

function buildContext(weekPlan: WeekPlan, userRecipes: Recipe[], nutriplannerRecipes: Recipe[]): string {
  const days = weekPlan
    .map(d =>
      `${d.day}: ` +
      d.meals
        .map(m => `${m.title}${m.recipes.length ? ` (${m.recipes.map(r => r.name).join(', ')})` : ' (vacío)'}`)
        .join(' | ')
    )
    .join('\n');
  const recipes = [...userRecipes, ...nutriplannerRecipes].map(r => r.name).slice(0, 120).join(', ');
  return `DÍAS Y COMIDAS:\n${days}\n\nRECETAS DISPONIBLES:\n${recipes}`;
}

export function AssistantDialog({
  isOpen,
  onClose,
  weekPlan,
  userRecipes,
  nutriplannerRecipes,
  activeGoalMacros,
  dietPreference,
  onDrop,
  onClearMeal,
  onClearDay,
  onClearWeek,
  onAutocomplete,
  onSetGoal,
  onCreateRecipe,
}: AssistantDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(raw?: string) => void>(() => {});

  const { speak, cancel: cancelSpeech, isSupported: ttsSupported, voices, voiceURI, setVoice } =
    useSpeechSynthesis({ lang: 'es-ES' });
  const { isListening, isSupported: sttSupported, start: startListening, stop: stopListening } =
    useSpeechRecognition({
      lang: 'es-ES',
      onResult: (t) => sendRef.current(t),
      onError: (message) => toast({ variant: 'destructive', title: 'Micrófono', description: message }),
    });

  const say = (text: string) => {
    if (voiceOn && ttsSupported && text) speak(text);
  };

  const { execute } = useAssistantActions({
    weekPlan,
    userRecipes,
    nutriplannerRecipes,
    activeGoalMacros,
    onDrop,
    onClearMeal,
    onClearDay,
    onClearWeek,
    onAutocomplete,
    onSetGoal,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending, isLoading]);

  const append = (msg: ChatMessage) => setMessages(prev => [...prev, msg]);

  const applyResult = (res: AssistantExecResult) => {
    append({ role: 'assistant', text: res.message });
    say(res.message);
  };

  const handleSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isLoading) return;
    setInput('');
    setPending(null);
    append({ role: 'user', text });
    setIsLoading(true);
    try {
      const context = buildContext(weekPlan, userRecipes, nutriplannerRecipes);
      const result = await askAssistant({ message: text, context });
      if (result.reply) {
        append({ role: 'assistant', text: result.reply });
        say(result.reply);
      }

      if (result.action === 'create_recipe') {
        // Recipe creation is generated here and handed back to the host, which
        // opens the RecipeDialog prefilled for the user to review and save.
        const description = ((result.args?.description as string) ?? text).trim();
        const generated = await generateRecipe({
          description,
          nutritionalGoal: activeGoalMacros,
          diet: dietPreference,
        });
        if (generated) {
          // Split the model output: a lean Recipe for the form, plus the
          // per-100g estimates so the dialog can offer to add new ingredients.
          const recipe: Omit<Recipe, 'id'> = {
            name: generated.name,
            description: generated.description,
            instructions: generated.instructions,
            ingredients: generated.ingredients.map(({ id, name, quantity, unit }) => ({
              id, name, quantity, unit,
            })),
            calories: generated.calories,
            protein: generated.protein,
            carbs: generated.carbs,
            fat: generated.fat,
            imageHint: generated.imageHint,
            servings: generated.servings,
            dietTags: generated.dietTags,
          };
          const aiIngredients: AiIngredientEstimate[] = generated.ingredients.map((i) => ({
            name: i.name,
            calories: i.calories,
            protein: i.protein,
            carbs: i.carbs,
            fat: i.fat,
            fiber: i.fiber,
            corrected: i.corrected,
            note: i.note,
          }));
          if (!result.reply) {
            const msg = 'He preparado una receta. Revísala, añade los ingredientes nuevos y guárdala si te gusta.';
            append({ role: 'assistant', text: msg });
            say(msg);
          }
          onCreateRecipe(recipe, aiIngredients);
          onClose();
        } else {
          const msg = 'No he podido crear la receta. ¿Puedes darme un poco más de detalle?';
          append({ role: 'assistant', text: msg });
          say(msg);
        }
      } else if (result.action && isAssistantAction(result.action)) {
        const res = execute(result.action, result.args ?? {}, false);
        if (res.needsConfirmation) {
          setPending({ name: result.action, args: result.args ?? {}, prompt: res.message });
          say(res.message);
        } else {
          applyResult(res);
        }
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getAiErrorMessage(e, 'No se pudo procesar tu mensaje.'),
        ...(isRetryableAiError(e) && {
          action: <ToastAction altText="Reintentar" onClick={() => handleSend(text)}>Reintentar</ToastAction>,
        }),
      });
    } finally {
      setIsLoading(false);
    }
  };
  sendRef.current = handleSend;

  const confirmPending = () => {
    if (!pending || !isAssistantAction(pending.name)) return;
    const res = execute(pending.name, pending.args, true);
    setPending(null);
    applyResult(res);
  };

  const toggleVoice = () => {
    if (voiceOn) cancelSpeech();
    setVoiceOn(v => !v);
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-glass flex flex-col h-[70vh] max-h-[85vh] min-h-0">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Asistente
            </DialogTitle>
            {ttsSupported && (
              <div className="flex items-center gap-1">
                {voiceOn && voices.length > 1 && (
                  <Select value={voiceURI ?? undefined} onValueChange={setVoice}>
                    <SelectTrigger
                      className="h-8 w-[150px] text-xs"
                      title="Elegir voz"
                      aria-label="Elegir voz del asistente"
                    >
                      <SelectValue placeholder="Voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((v) => (
                        <SelectItem key={v.uri} value={v.uri} className="text-xs">
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={voiceOn ? 'Silenciar voz' : 'Activar respuesta por voz'}
                  aria-label={voiceOn ? 'Silenciar respuesta por voz' : 'Activar respuesta por voz'}
                  aria-pressed={voiceOn}
                  onClick={toggleVoice}
                >
                  {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
          <DialogDescription>
            Pídeme cosas como “añade ensalada césar a la cena del martes” o “vacía el lunes”.
            {sttSupported && ' Toca el micro para hablar.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-3 py-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                <Bot className="h-8 w-8 mb-2" />
                <p className="text-sm">¿En qué te ayudo con tu plan?</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {pending && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm">{pending.prompt}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={confirmPending}>
                    Sí, hazlo
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPending(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="space-y-1.5">
          <div className="flex gap-2">
            {sttSupported && (
              <Button
                size="icon"
                variant={isListening ? 'default' : 'outline'}
                className={cn('shrink-0', isListening && 'animate-pulse')}
                title={isListening ? 'Escuchando...' : 'Hablar'}
                aria-label={isListening ? 'Escuchando, toca para detener' : 'Hablar por voz'}
                onClick={toggleMic}
                disabled={isLoading}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={isListening ? 'Escuchando...' : 'Escribe una instrucción...'}
              disabled={isLoading}
            />
            <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!sttSupported && (
            <p className="text-[11px] text-muted-foreground px-1">
              Tu navegador no admite el dictado por voz. Escribe tu instrucción.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
