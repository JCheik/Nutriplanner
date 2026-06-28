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
import { Bot, Send, LoaderCircle, Wand2, Mic, Volume2, VolumeX, Camera, X as XIcon, EggFried, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { getAiErrorMessage, isRetryableAiError } from '@/lib/ai-error';
import { askAssistant } from '@/ai/flows/assistant-flow';
import { generateRecipe } from '@/ai/flows/generate-recipe-flow';
import { parseFridgeImage } from '@/ai/flows/parse-fridge-image-flow';
import {
  useAssistantActions,
  type AssistantExecResult,
} from '@/hooks/use-assistant-actions';
import { isAssistantAction } from '@/lib/assistant-actions';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useAiQuota } from '@/hooks/use-ai-quota';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import type { WeekPlan, Recipe, GoalMacros, GoalType, DietTag, AiIngredientEstimate } from '@/lib/types';

interface ScanResult {
  ingredients: string[];
  recipes: Array<Omit<Recipe, 'id'>>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
  scanResult?: ScanResult;
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
  /** Start listening as soon as the dialog opens (one-tap-to-talk on mobile). */
  autoListen?: boolean;
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
  autoListen,
}: AssistantDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The on/off preference for spoken replies persists across sessions. The chosen
  // voice (voiceURI) is already persisted by useSpeechSynthesis.
  const [voiceOn, setVoiceOn] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('nutriplanner.tts.enabled') === '1';
    } catch {
      return false;
    }
  });
  // null = not yet tested, true = Cloud TTS API works, false = not available
  const cloudTtsRef = useRef<boolean | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const { check: checkAiQuota } = useAiQuota();
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

  // One-tap-to-talk: when opened with autoListen (the mobile mic FAB), start
  // listening immediately. Guarded by a ref so it fires once per open, not every
  // time `isListening` flips.
  const autoListenedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      autoListenedRef.current = false;
      return;
    }
    if (autoListen && sttSupported && !autoListenedRef.current) {
      autoListenedRef.current = true;
      startListening();
    }
  }, [isOpen, autoListen, sttSupported, startListening]);

  // Try Google Cloud TTS Neural2 first (natural-sounding); fall back to browser TTS.
  const say = async (text: string) => {
    if (!voiceOn || !text) return;

    if (cloudTtsRef.current !== false) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const { audioContent } = await res.json() as { audioContent: string };
          currentAudioRef.current?.pause();
          const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
          currentAudioRef.current = audio;
          cloudTtsRef.current = true;
          audio.play().catch(() => {
            // Autoplay blocked — fall back to browser TTS silently.
            cloudTtsRef.current = false;
            if (ttsSupported) speak(text);
          });
          return;
        }
        // API not enabled or key restricted — don't retry.
        cloudTtsRef.current = false;
      } catch {
        cloudTtsRef.current = false;
      }
    }

    // Browser TTS fallback.
    if (ttsSupported) speak(text);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ base64: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScanFridge = async () => {
    if (!attachedImage || isLoading) return;
    const quota = await checkAiQuota();
    if (!quota.allowed) {
      toast({ title: 'Límite de IA', description: quota.message ?? 'Has alcanzado el límite de peticiones de IA por hoy.' });
      return;
    }
    const imageBase64 = attachedImage.base64;
    setAttachedImage(null);
    append({ role: 'user', text: '📷 Analiza mi nevera', imageBase64 });
    setIsLoading(true);
    try {
      const result = await parseFridgeImage({ imageBase64, nutritionalGoal: activeGoalMacros });
      const detected = result.ingredients.length
        ? result.ingredients.slice(0, 8).join(', ') + (result.ingredients.length > 8 ? '…' : '')
        : null;
      const replyText = detected
        ? `He detectado: ${detected}. He preparado ${result.recipes.length} recetas con estos ingredientes.`
        : `He analizado la imagen y preparado ${result.recipes.length} recetas con lo que veo.`;
      append({
        role: 'assistant',
        text: replyText,
        scanResult: { ingredients: result.ingredients, recipes: result.recipes as Array<Omit<Recipe, 'id'>> },
      });
      say(replyText);
    } catch (e) {
      const msg = getAiErrorMessage(e, 'No se pudo analizar la imagen. Intenta de nuevo.');
      append({ role: 'assistant', text: msg });
      toast({ variant: 'destructive', title: 'Error al escanear', description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (raw?: string) => {
    if (attachedImage) { handleScanFridge(); return; }
    const text = (raw ?? input).trim();
    if (!text || isLoading) return;
    setInput('');
    setPending(null);
    append({ role: 'user', text });

    // Per-user daily AI quota gate (alpha cost guard).
    const quota = await checkAiQuota();
    if (!quota.allowed) {
      const msg = quota.message ?? 'Has alcanzado el límite de peticiones de IA por hoy.';
      append({ role: 'assistant', text: msg });
      say(msg);
      return;
    }

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
    if (voiceOn) {
      cancelSpeech();
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
    }
    setVoiceOn(v => {
      const next = !v;
      try {
        localStorage.setItem('nutriplanner.tts.enabled', next ? '1' : '0');
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { currentAudioRef.current?.pause(); currentAudioRef.current = null; onClose(); } }}>
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
            Pídeme cosas como “añade ensalada césar al martes” o “vacía el lunes”. Toca 📷 para escanear tu nevera.
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
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm space-y-2',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {m.imageBase64 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageBase64} alt="Foto de nevera" className="rounded-lg max-h-48 object-cover w-full" />
                  )}
                  {m.text && <p>{m.text}</p>}
                  {m.scanResult && m.scanResult.recipes.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {m.scanResult.recipes.map((recipe, ri) => (
                        <div key={ri} className="rounded-lg border bg-background text-foreground p-2.5 space-y-1.5">
                          <p className="font-semibold text-sm leading-tight">{recipe.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" />{Math.round(recipe.calories)} kcal</span>
                            <span className="flex items-center gap-0.5"><EggFried className="h-3 w-3" />{Math.round(recipe.protein)}g</span>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 text-xs w-full mt-0.5"
                            onClick={() => { onCreateRecipe(recipe); onClose(); }}
                          >
                            Revisar y guardar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
          {attachedImage && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachedImage.base64} alt="Vista previa" className="w-full h-full object-cover" />
              <button
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                onClick={() => setAttachedImage(null)}
                aria-label="Quitar foto"
              >
                <XIcon className="h-3 w-3 text-white" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              title="Foto de nevera"
              aria-label="Adjuntar foto de nevera"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Camera className="h-4 w-4" />
            </Button>
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
              placeholder={attachedImage ? 'Listo para analizar…' : isListening ? 'Escuchando…' : 'Escribe una instrucción…'}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && !attachedImage)}
              aria-label="Enviar"
            >
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
