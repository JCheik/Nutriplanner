'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { collection, addDoc } from 'firebase/firestore';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { importRecipe, type UnifiedRecipe } from '@/ai/flows/import-recipe-flow';
import { normalizeText } from '@/lib/utils';
import type { Recipe, BaseIngredient } from '@/lib/types';
import { Link2, Loader2, CheckCircle2, AlertTriangle, Sparkles, Download, Info, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 'input'     → URL + textarea
// 'fetching'  → getting page content from URL
// 'analyzing' → AI processing
// 'reviewing' → ingredient review
// 'creating'  → saving to Firestore
type ImportStep = 'input' | 'fetching' | 'analyzing' | 'reviewing' | 'creating';

interface MissingIngredient {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  selected: boolean;
  corrected?: boolean;
  note?: string;
}

interface RecipeImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeImported: (recipe: Omit<Recipe, 'id'>) => void;
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 items-center min-w-[52px]">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-7 px-1.5 text-xs text-center w-full"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
    </div>
  );
}

export function RecipeImportDialog({ isOpen, onClose, onRecipeImported }: RecipeImportDialogProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const ingredientsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'ingredients') : null),
    [firestore]
  );
  const { data: ingredientDB } = useCollection<BaseIngredient>(ingredientsRef);

  const [step, setStep] = useState<ImportStep>('input');
  const [url, setUrl] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'ok' | 'warn'>('idle');
  const [fetchStatusMsg, setFetchStatusMsg] = useState('');
  // 'none' = no video URL found, 'youtube' = YouTube (direct works), 'cdn' = social CDN (might work)
  const [videoUrlKind, setVideoUrlKind] = useState<'none' | 'youtube' | 'cdn'>('none');
  const [cachedVideoUrl, setCachedVideoUrl] = useState<string | undefined>();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [extractedRecipe, setExtractedRecipe] = useState<UnifiedRecipe | null>(null);
  const [foundIngredients, setFoundIngredients] = useState<string[]>([]);
  const [missingIngredients, setMissingIngredients] = useState<MissingIngredient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cdnFallbackOccurred, setCdnFallbackOccurred] = useState(false);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [progressStep, setProgressStep] = useState(0);
  const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach(clearTimeout);
      abortControllerRef.current?.abort();
    };
  }, []);

  const startProgress = (steps: string[], cumulativeDelays: number[]) => {
    progressTimersRef.current.forEach(clearTimeout);
    progressTimersRef.current = [];
    setProgressSteps(steps);
    setProgressStep(0);
    cumulativeDelays.forEach((delay, i) => {
      progressTimersRef.current.push(setTimeout(() => setProgressStep(i + 1), delay));
    });
  };

  const clearProgress = () => {
    progressTimersRef.current.forEach(clearTimeout);
    progressTimersRef.current = [];
  };

  const handleCancelAnalysis = () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    clearProgress();
    setProgressSteps([]);
    setProgressStep(0);
    setStep('input');
  };

  const isYouTubeUrl = (u: string) => /youtube\.com|youtu\.be/i.test(u);

  const getAuthToken = async (): Promise<string> => {
    if (!user) throw new Error('Debes iniciar sesión para usar esta función.');
    return user.getIdToken();
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;

    // YouTube: no page fetch needed, Gemini handles it directly
    if (isYouTubeUrl(url.trim())) {
      setCachedVideoUrl(url.trim());
      setVideoUrlKind('youtube');
      setFetchStatus('ok');
      setFetchStatusMsg('YouTube detectado — Gemini analizará el vídeo directamente.');
      return;
    }

    setStep('fetching');
    setFetchStatus('idle');
    setFetchStatusMsg('');
    setVideoUrlKind('none');
    setCachedVideoUrl(undefined);

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/fetch-social-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() }),
      });
      const pageData = await res.json();

      if (!res.ok || pageData.success === false) {
        setFetchStatus('warn');
        setFetchStatusMsg(pageData.error || 'Error al acceder a la URL. Pega el texto manualmente o sube el vídeo.');
        setStep('input');
        return;
      }

      const parts: string[] = [];
      if (pageData.title) parts.push(pageData.title);
      if (pageData.description) parts.push(pageData.description);
      const extracted = parts.join('\n\n');

      if (extracted.length > 30) {
        setRecipeText((prev) => {
          const existing = prev.trim();
          return existing ? `${extracted}\n\n${existing}` : extracted;
        });
      }

      if (pageData.videoUrl) {
        setCachedVideoUrl(pageData.videoUrl);
        setVideoUrlKind('cdn');
        setFetchStatus('ok');
        setFetchStatusMsg(
          extracted.length > 30
            ? 'Texto extraído y URL de vídeo encontrada. Prueba a analizar sin descarga.'
            : 'URL de vídeo encontrada. Prueba a analizar sin descarga.'
        );
      } else if (extracted.length > 30) {
        setFetchStatus('ok');
        setFetchStatusMsg('Texto extraído. Revísalo y añade más detalles si es necesario.');
      } else {
        setFetchStatus('warn');
        setFetchStatusMsg('No se pudo extraer contenido del post. Pega el texto manualmente o sube el vídeo.');
      }
    } catch {
      setFetchStatus('warn');
      setFetchStatusMsg('Error al acceder a la URL. Pega el texto manualmente o sube el vídeo.');
    }

    setStep('input');
  };

  const handleAnalyze = async () => {
    if (!videoFile && !cachedVideoUrl && !recipeText.trim()) return;
    setError(null);
    setCdnFallbackOccurred(false);
    setStep('analyzing');
    isCancelledRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getAuthToken();
      if (isCancelledRef.current) return;
      let recipe: UnifiedRecipe;

      if (videoFile) {
        startProgress(
          ['Subiendo vídeo al servidor', 'Google procesando el vídeo', 'Gemini extrayendo la receta'],
          [10000, 35000]
        );
        const fd = new FormData();
        fd.append('video', videoFile);
        if (recipeText.trim()) fd.append('caption', recipeText.trim());
        const res = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          body: fd,
        });
        if (isCancelledRef.current) return;
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error al analizar el vídeo.');
        recipe = data.recipe as UnifiedRecipe;

      } else if (cachedVideoUrl && (videoUrlKind === 'youtube' || videoUrlKind === 'cdn')) {
        startProgress(
          ['Analizando vídeo con Gemini', 'Extrayendo receta y macros'],
          [10000]
        );
        const res = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          signal: controller.signal,
          body: JSON.stringify({ videoUrl: cachedVideoUrl, caption: recipeText.trim() }),
        });
        if (isCancelledRef.current) return;
        const data = await res.json();
        if (data.success) {
          recipe = data.recipe as UnifiedRecipe;
        } else if (videoUrlKind === 'cdn') {
          setCdnFallbackOccurred(true);
          recipe = await importRecipe({ url: url.trim() || undefined, caption: recipeText.trim() });
          if (isCancelledRef.current) return;
        } else {
          throw new Error(data.error || 'No se pudo analizar el vídeo desde la URL.');
        }

      } else {
        startProgress(
          ['Extrayendo receta con IA', 'Verificando ingredientes y macros'],
          [8000]
        );
        recipe = await importRecipe({ url: url.trim() || undefined, caption: recipeText.trim() });
        if (isCancelledRef.current) return;
      }

      setExtractedRecipe(recipe);

      const dbMap = new Map((ingredientDB || []).map((i) => [normalizeText(i.name), i]));
      const found: string[] = [];
      const missing: MissingIngredient[] = [];

      for (const ing of recipe.ingredients) {
        if (dbMap.has(normalizeText(ing.name))) {
          found.push(ing.name);
        } else {
          missing.push({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            calories: Math.round(ing.calories),
            protein: Math.round(ing.protein),
            carbs: Math.round(ing.carbs),
            fat: Math.round(ing.fat),
            fiber: Math.round(ing.fiber),
            selected: true,
            corrected: ing.corrected,
            note: ing.note,
          });
        }
      }

      setFoundIngredients(found);
      setMissingIngredients(missing);
      clearProgress();
      setStep('reviewing');
    } catch (err) {
      if (isCancelledRef.current || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }
      console.error('Import error:', err);
      clearProgress();
      setError('No se pudo analizar la receta. Asegúrate de que el texto incluye ingredientes y pasos.');
      setStep('input');
    }
  };

  const handleConfirm = async () => {
    if (!extractedRecipe || !user || !firestore) return;
    setStep('creating');

    try {
      const selectedMissing = missingIngredients.filter((i) => i.selected);

      for (const ing of selectedMissing) {
        await addDoc(collection(firestore, 'ingredients'), {
          name: ing.name,
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          fiber: ing.fiber,
          createdBy: user.uid,
        });
      }

      const recipe: Omit<Recipe, 'id'> = {
        name: extractedRecipe.name,
        description: extractedRecipe.description,
        instructions: extractedRecipe.instructions,
        // Strip per-100g fields — Recipe.ingredients only stores id/name/quantity/unit
        ingredients: extractedRecipe.ingredients.map(({ id, name, quantity, unit }) => ({
          id, name, quantity, unit,
        })),
        calories: extractedRecipe.calories,
        protein: extractedRecipe.protein,
        carbs: extractedRecipe.carbs,
        fat: extractedRecipe.fat,
        servings: extractedRecipe.servings ?? 1,
        imageHint: extractedRecipe.imageHint,
      };

      onRecipeImported(recipe);
      handleClose();
    } catch (err) {
      console.error('Create ingredients error:', err);
      setError('Error al guardar los ingredientes. Inténtalo de nuevo.');
      setStep('reviewing');
    }
  };

  const handleClose = () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    clearProgress();
    setProgressSteps([]);
    setProgressStep(0);
    setStep('input');
    setUrl('');
    setRecipeText('');
    setFetchStatus('idle');
    setFetchStatusMsg('');
    setVideoUrlKind('none');
    setCachedVideoUrl(undefined);
    setVideoFile(null);
    setExtractedRecipe(null);
    setFoundIngredients([]);
    setMissingIngredients([]);
    setError(null);
    setCdnFallbackOccurred(false);
    onClose();
  };

  const updateMissingMacro = (
    index: number,
    field: keyof Pick<MissingIngredient, 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>,
    value: number
  ) => {
    setMissingIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const toggleMissingSelected = (index: number) => {
    setMissingIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, selected: !ing.selected } : ing))
    );
  };

  const isLoadingStep = step === 'fetching' || step === 'analyzing' || step === 'creating';
  const canAnalyze = !!videoFile || !!cachedVideoUrl || recipeText.trim().length > 0;
  const simpleLoadingMessage =
    step === 'fetching' ? 'Obteniendo contenido del post...' : 'Guardando ingredientes nuevos...';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl bg-glass max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Importar receta desde post
          </DialogTitle>
          <DialogDescription>
            Sube el vídeo descargado del reel para que la IA lo analice, o pega el texto de la publicación.
          </DialogDescription>
        </DialogHeader>

        {/* LOADING — simple spinner for fetch/create */}
        {(step === 'fetching' || step === 'creating') && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{simpleLoadingMessage}</p>
          </div>
        )}

        {/* ANALYZING — stepper with granular progress */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center gap-6 py-10">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />

            <div className="space-y-3 text-center">
              <p className="text-sm font-medium">
                {progressSteps[progressStep] ?? 'Procesando...'}
              </p>

              {/* Step dots */}
              {progressSteps.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {progressSteps.map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'rounded-full transition-all duration-700',
                          i < progressStep
                            ? 'h-2 w-6 bg-primary'
                            : i === progressStep
                            ? 'h-2 w-6 bg-primary/50 animate-pulse'
                            : 'h-1.5 w-1.5 bg-muted-foreground/30'
                        )}
                      />
                      {i < progressSteps.length - 1 && (
                        <div
                          className={cn(
                            'h-px w-5 transition-colors duration-700',
                            i < progressStep ? 'bg-primary' : 'bg-muted-foreground/20'
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {videoFile
                  ? 'Los vídeos pueden tardar hasta 60 segundos'
                  : 'Esto puede tardar unos segundos'}
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleCancelAnalysis}>
              Cancelar
            </Button>
          </div>
        )}

        {/* INPUT */}
        {step === 'input' && (
          <div className="space-y-4 py-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Video upload */}
            <div className="space-y-1.5">
              <Label>Vídeo del reel (recomendado)</Label>
              {videoFile ? (
                <div className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2.5">
                  <Video className="h-5 w-5 text-violet-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Quitar vídeo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 cursor-pointer hover:bg-accent/20 transition-colors">
                  <Video className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground text-center">
                    Descarga el reel y súbelo aquí
                    <br />
                    <span className="text-xs">MP4, MOV · máx. 100 MB</span>
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 100 * 1024 * 1024) {
                        setError('El vídeo supera los 100 MB. Usa un vídeo más corto o en menor calidad.');
                        return;
                      }
                      setVideoFile(f);
                      setError(null);
                    }}
                  />
                </label>
              )}
              <p className="text-[11px] text-muted-foreground">
                Gemini analiza el audio, el texto en pantalla y los ingredientes visibles del vídeo.
              </p>
            </div>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                o sin vídeo
              </span>
            </div>

            {/* URL row */}
            <div className="space-y-1.5">
              <Label>URL del post (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.instagram.com/p/... o https://www.tiktok.com/..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setFetchStatus('idle');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && url.trim() && handleFetchUrl()}
                />
                <Button
                  variant="outline"
                  onClick={handleFetchUrl}
                  disabled={!url.trim()}
                  className="shrink-0"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Extraer texto
                </Button>
              </div>
              {fetchStatus === 'ok' && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {fetchStatusMsg}
                  {videoUrlKind === 'youtube' && (
                    <span className="ml-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      YouTube
                    </span>
                  )}
                  {videoUrlKind === 'cdn' && (
                    <span className="ml-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      vídeo encontrado
                    </span>
                  )}
                </p>
              )}
              {fetchStatus === 'warn' && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {fetchStatusMsg}
                </p>
              )}
            </div>

            {/* Text area — always visible, main input */}
            <div className="space-y-1.5">
              <Label>
                Texto de la receta{' '}
                <span className="font-normal text-muted-foreground">(ingredientes, cantidades y pasos)</span>
              </Label>
              <Textarea
                placeholder="Pega aquí el texto del post: ingredientes con cantidades, pasos de preparación...

Cuanto más detallado sea el texto, mejor resultado obtendrá la IA."
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                rows={9}
                className="resize-none text-sm"
                autoFocus={!url}
              />
              <p className="text-[11px] text-muted-foreground">
                La IA extrae la receta a partir de este texto. Cuantos más detalles incluyas, más precisos serán los macros.
              </p>
            </div>
          </div>
        )}

        {/* REVIEWING */}
        {step === 'reviewing' && extractedRecipe && (
          <ScrollArea className="flex-1 overflow-auto pr-1">
            <div className="space-y-4 py-2">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {cdnFallbackOccurred && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    El vídeo del post no era accesible directamente — la receta se extrajo del{' '}
                    <strong>texto de la publicación</strong>. Para un análisis más preciso, descarga el vídeo y súbelo manualmente.
                  </span>
                </div>
              )}

              {/* Recipe preview */}
              <div className="rounded-lg border bg-card/50 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base">{extractedRecipe.name}</h3>
                    {extractedRecipe.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{extractedRecipe.description}</p>
                    )}
                  </div>
                  {extractedRecipe.servings && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap border rounded-full px-2 py-0.5">
                      {extractedRecipe.servings} rac.
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm pt-1">
                  <span className="font-medium">{Math.round(extractedRecipe.calories)} kcal</span>
                  <span className="text-muted-foreground">
                    P: {Math.round(extractedRecipe.protein)}g · C: {Math.round(extractedRecipe.carbs)}g · G:{' '}
                    {Math.round(extractedRecipe.fat)}g
                  </span>
                </div>
              </div>

              {/* Found ingredients */}
              {foundIngredients.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">
                      En tu base de datos ({foundIngredients.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {foundIngredients.map((name) => (
                      <span
                        key={name}
                        className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-0.5"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing ingredients */}
              {missingIngredients.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      Ingredientes nuevos ({missingIngredients.length})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    No están en tu base de datos. Revisa los macros estimados por IA (por 100g) y ajusta si es necesario.
                  </p>

                  <div className="space-y-2 pl-2">
                    {missingIngredients.map((ing, index) => (
                      <div
                        key={ing.name}
                        className={cn(
                          'rounded-lg border p-3 space-y-2 transition-colors',
                          ing.selected ? 'border-border bg-card/40' : 'border-dashed opacity-50'
                        )}
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none"
                          onClick={() => toggleMissingSelected(index)}
                        >
                          <Checkbox
                            checked={ing.selected}
                            onCheckedChange={() => toggleMissingSelected(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm font-medium">{ing.name}</span>
                          {ing.corrected && (
                            <span
                              title={ing.note || 'Corregido por IA'}
                              className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 cursor-help"
                            >
                              <Info className="h-3 w-3" />
                              Corregido
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {ing.quantity} {ing.unit}
                          </span>
                        </div>
                        {ing.corrected && ing.note && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 pl-7">
                            {ing.note}
                          </p>
                        )}

                        {ing.selected && (
                          <div className="flex gap-2 pt-1">
                            <MacroInput
                              label="Kcal"
                              value={ing.calories}
                              onChange={(v) => updateMissingMacro(index, 'calories', v)}
                            />
                            <MacroInput
                              label="Prot (g)"
                              value={ing.protein}
                              onChange={(v) => updateMissingMacro(index, 'protein', v)}
                            />
                            <MacroInput
                              label="Carbs (g)"
                              value={ing.carbs}
                              onChange={(v) => updateMissingMacro(index, 'carbs', v)}
                            />
                            <MacroInput
                              label="Grasa (g)"
                              value={ing.fat}
                              onChange={(v) => updateMissingMacro(index, 'fat', v)}
                            />
                            <MacroInput
                              label="Fibra (g)"
                              value={ing.fiber}
                              onChange={(v) => updateMissingMacro(index, 'fiber', v)}
                            />
                            <div className="flex items-end pb-1">
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">/ 100g</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* FOOTER */}
        {!isLoadingStep && (
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>

            {step === 'input' && (
              <Button onClick={handleAnalyze} disabled={!canAnalyze}>
                <Sparkles className="mr-2 h-4 w-4" />
                Analizar con IA
              </Button>
            )}

            {step === 'reviewing' && (
              <>
                <Button variant="outline" onClick={() => setStep('input')}>
                  Editar texto
                </Button>
                <Button onClick={handleConfirm}>Importar receta</Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
