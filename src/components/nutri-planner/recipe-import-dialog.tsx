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
import { importRecipeFlow, type ImportedRecipe } from '@/ai/flows/import-recipe-flow';
import { estimateIngredientMacrosFlow, type EstimatedIngredient } from '@/ai/flows/estimate-ingredient-macros-flow';
import { normalizeText } from '@/lib/utils';
import type { Recipe, BaseIngredient } from '@/lib/types';
import { Link2, Loader2, CheckCircle2, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImportStep = 'input' | 'loading' | 'reviewing' | 'creating';

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
  const [manualText, setManualText] = useState('');
  const [showManualText, setShowManualText] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedRecipe, setExtractedRecipe] = useState<ImportedRecipe | null>(null);
  const [foundIngredients, setFoundIngredients] = useState<string[]>([]);
  const [missingIngredients, setMissingIngredients] = useState<MissingIngredient[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    const hasUrl = url.trim().length > 0;
    const hasText = manualText.trim().length > 0;
    if (!hasUrl && !hasText) return;

    setError(null);
    setStep('loading');

    try {
      let caption: string | undefined;
      let videoUrl: string | undefined;
      let imageUrl: string | undefined;

      if (hasUrl) {
        setStatusMessage('Accediendo a la publicación...');
        const res = await fetch('/api/fetch-social-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });
        const pageData = await res.json();
        if (pageData.success) {
          caption = [pageData.title, pageData.description].filter(Boolean).join('\n') || undefined;
          videoUrl = pageData.videoUrl || undefined;
          imageUrl = pageData.imageUrl || undefined;
        }
      }

      if (hasText) {
        caption = hasUrl && caption ? `${caption}\n\n${manualText.trim()}` : manualText.trim();
      }

      setStatusMessage('Analizando con IA...');
      const recipe = await importRecipeFlow({
        url: hasUrl ? url.trim() : undefined,
        caption,
        videoUrl,
        imageUrl,
      });

      setExtractedRecipe(recipe);
      setStatusMessage('Verificando ingredientes en la base de datos...');

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
        setStatusMessage('Estimando macros de ingredientes nuevos...');
        const estimated: EstimatedIngredient[] = await estimateIngredientMacrosFlow({
          ingredientNames: missingNames.map((m) => m.name),
        });

        const missing: MissingIngredient[] = missingNames.map((m) => {
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
            selected: true,
          };
        });

        setMissingIngredients(missing);
      } else {
        setMissingIngredients([]);
      }

      setStep('reviewing');
    } catch (err) {
      console.error('Import error:', err);
      setError(
        'No se pudo importar la receta. Comprueba la URL o añade el texto de la publicación manualmente.'
      );
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
    setManualText('');
    setShowManualText(false);
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

  const isLoading = step === 'loading' || step === 'creating';
  const canAnalyze = url.trim().length > 0 || manualText.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl bg-glass max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Importar receta desde URL
          </DialogTitle>
          <DialogDescription>
            Pega el enlace de un post de Instagram o TikTok y la IA extraerá la receta automáticamente.
          </DialogDescription>
        </DialogHeader>

        {/* LOADING */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {step === 'creating' ? 'Guardando ingredientes nuevos...' : statusMessage}
            </p>
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

            <div className="space-y-2">
              <Label>Enlace de la publicación</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.instagram.com/p/... o https://www.tiktok.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canAnalyze && handleAnalyze()}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowManualText((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showManualText ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              ¿No funciona la URL? Añade el texto de la publicación manualmente
            </button>

            {showManualText && (
              <div className="space-y-2">
                <Label>Texto / caption del post</Label>
                <Textarea
                  placeholder="Pega aquí la descripción, ingredientes o instrucciones del post..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={5}
                />
              </div>
            )}
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
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {extractedRecipe.description}
                      </p>
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
                    Estos ingredientes no están en tu base de datos. Revisa los macros estimados por IA
                    (por 100g) antes de guardarlos.
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
                          <span className="text-xs text-muted-foreground ml-auto">
                            {ing.quantity} {ing.unit}
                          </span>
                        </div>

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
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                / 100g
                              </span>
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
        {!isLoading && (
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>

            {step === 'input' && (
              <Button onClick={handleAnalyze} disabled={!canAnalyze}>
                <Sparkles className="mr-2 h-4 w-4" />
                Analizar receta
              </Button>
            )}

            {step === 'reviewing' && (
              <Button onClick={handleConfirm}>
                Importar receta
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
