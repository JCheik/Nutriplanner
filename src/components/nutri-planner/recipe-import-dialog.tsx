'use client';

import { useState } from 'react';
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
import { importRecipeFlow } from '@/ai/flows/import-recipe-flow';
import { estimateIngredientMacrosFlow } from '@/ai/flows/estimate-ingredient-macros-flow';
import { validateRecipeFlow } from '@/ai/flows/validate-recipe-flow';
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

interface ImportedRecipe {
  name: string;
  description: string;
  instructions: string;
  ingredients: { id: string; name: string; quantity: number; unit: string }[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  imageHint?: string;
}

interface EstimatedIngredient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

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
  const [cachedVideoUrl, setCachedVideoUrl] = useState<string | undefined>();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [extractedRecipe, setExtractedRecipe] = useState<ImportedRecipe | null>(null);
  const [foundIngredients, setFoundIngredients] = useState<string[]>([]);
  const [missingIngredients, setMissingIngredients] = useState<MissingIngredient[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setStep('fetching');
    setFetchStatus('idle');
    setFetchStatusMsg('');

    try {
      const res = await fetch('/api/fetch-social-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const pageData = await res.json();

      const parts: string[] = [];
      if (pageData.title) parts.push(pageData.title);
      if (pageData.description) parts.push(pageData.description);
      const extracted = parts.join('\n\n');

      if (extracted.length > 30) {
        setRecipeText((prev) => {
          const existing = prev.trim();
          return existing ? `${extracted}\n\n${existing}` : extracted;
        });
        setCachedVideoUrl(pageData.videoUrl || undefined);
        setFetchStatus('ok');
        setFetchStatusMsg('Texto extraído. Revísalo y añade más detalles si es necesario.');
      } else {
        setFetchStatus('warn');
        setFetchStatusMsg(
          'No se pudo extraer texto útil del post (Instagram y TikTok limitan el acceso). Pega el texto de la receta manualmente.'
        );
      }
    } catch {
      setFetchStatus('warn');
      setFetchStatusMsg('Error al acceder a la URL. Pega el texto manualmente.');
    }

    setStep('input');
  };

  const handleAnalyze = async () => {
    if (!videoFile && !recipeText.trim()) return;
    setError(null);
    setStep('analyzing');

    try {
      // 1. Extract recipe — from video file or from text
      let recipe: ImportedRecipe;

      if (videoFile) {
        const fd = new FormData();
        fd.append('video', videoFile);
        if (recipeText.trim()) fd.append('caption', recipeText.trim());

        const res = await fetch('/api/analyze-video', { method: 'POST', body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error al analizar el vídeo.');
        recipe = data.recipe as ImportedRecipe;
      } else {
        recipe = await importRecipeFlow({
          url: url.trim() || undefined,
          caption: recipeText.trim(),
          videoUrl: cachedVideoUrl,
        });
      }

      setExtractedRecipe(recipe);

      const dbMap = new Map(
        (ingredientDB || []).map((i) => [normalizeText(i.name), i])
      );

      const found: string[] = [];
      const missingNames: { name: string; quantity: number; unit: string }[] = [];

      for (const ing of recipe.ingredients) {
        if (dbMap.has(normalizeText(ing.name))) {
          found.push(ing.name);
        } else {
          missingNames.push({ name: ing.name, quantity: ing.quantity, unit: ing.unit });
        }
      }

      setFoundIngredients(found);

      if (missingNames.length > 0) {
        // 2. Estimate per-100g macros for missing ingredients
        const estimated: EstimatedIngredient[] = await estimateIngredientMacrosFlow({
          ingredientNames: missingNames.map((m) => m.name),
        });

        const rawMissing = missingNames.map((m) => {
          const est = estimated.find(
            (e) => normalizeText(e.name) === normalizeText(m.name)
          ) || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, name: m.name };
          return {
            name: m.name,
            quantity: m.quantity,
            unit: m.unit,
            calories: Math.round(est.calories),
            protein: Math.round(est.protein),
            carbs: Math.round(est.carbs),
            fat: Math.round(est.fat),
            fiber: Math.round(est.fiber),
            isMissing: true,
          };
        });

        // 3. Validate & correct (quantities + per-100g values)
        const allIngredientsToValidate = [
          ...recipe.ingredients
            .filter((ing) => dbMap.has(normalizeText(ing.name)))
            .map((ing) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              isMissing: false,
            })),
          ...rawMissing,
        ];

        const validated = await validateRecipeFlow({ ingredients: allIngredientsToValidate });

        // Apply corrected quantities back to the found list too (update recipe state)
        const correctedFoundQtys = new Map<string, { quantity: number; unit: string }>();
        for (const v of validated) {
          if (!rawMissing.find((m) => normalizeText(m.name) === normalizeText(v.name))) {
            correctedFoundQtys.set(normalizeText(v.name), { quantity: v.quantity, unit: v.unit });
          }
        }
        if (correctedFoundQtys.size > 0) {
          setExtractedRecipe((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              ingredients: prev.ingredients.map((ing) => {
                const fix = correctedFoundQtys.get(normalizeText(ing.name));
                return fix ? { ...ing, ...fix } : ing;
              }),
            };
          });
        }

        // Build final missing list from validated results
        const missing: MissingIngredient[] = rawMissing.map((m) => {
          const v = validated.find((r) => normalizeText(r.name) === normalizeText(m.name));
          if (!v) return { ...m, selected: true };
          return {
            name: m.name,
            quantity: v.quantity,
            unit: v.unit,
            calories: Math.round(v.calories),
            protein: Math.round(v.protein),
            carbs: Math.round(v.carbs),
            fat: Math.round(v.fat),
            fiber: Math.round(v.fiber),
            selected: true,
            corrected: v.corrected,
            note: v.note,
          };
        });

        setMissingIngredients(missing);
      } else {
        // Still validate quantities for found-only recipes
        const allIngredientsToValidate = recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          isMissing: false,
        }));

        const validated = await validateRecipeFlow({ ingredients: allIngredientsToValidate });
        const correctedQtys = new Map(
          validated.filter((v) => v.corrected).map((v) => [
            normalizeText(v.name),
            { quantity: v.quantity, unit: v.unit },
          ])
        );
        if (correctedQtys.size > 0) {
          setExtractedRecipe((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              ingredients: prev.ingredients.map((ing) => {
                const fix = correctedQtys.get(normalizeText(ing.name));
                return fix ? { ...ing, ...fix } : ing;
              }),
            };
          });
        }
        setMissingIngredients([]);
      }

      setStep('reviewing');
    } catch (err) {
      console.error('Import error:', err);
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
        ingredients: extractedRecipe.ingredients,
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
    setStep('input');
    setUrl('');
    setRecipeText('');
    setFetchStatus('idle');
    setFetchStatusMsg('');
    setCachedVideoUrl(undefined);
    setVideoFile(null);
    setExtractedRecipe(null);
    setFoundIngredients([]);
    setMissingIngredients([]);
    setError(null);
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
  const canAnalyze = !!videoFile || recipeText.trim().length > 0;

  const loadingMessage =
    step === 'fetching'
      ? 'Obteniendo texto del post...'
      : step === 'analyzing'
      ? videoFile
        ? 'Subiendo vídeo y analizando con IA... (puede tardar 30-60 s)'
        : 'Analizando y verificando la receta con IA...'
      : 'Guardando ingredientes nuevos...';

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

        {/* LOADING */}
        {isLoadingStep && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
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
