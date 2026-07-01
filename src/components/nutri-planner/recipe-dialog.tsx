'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DialogState as DialogStateBase, Recipe, Ingredient, BaseIngredient, MealCategory, DietTag, AiIngredientEstimate } from '@/lib/types';
import { MEAL_CATEGORIES, MEAL_CATEGORY_LABELS, DIET_TAGS, DIET_TAG_LABELS } from '@/lib/constants';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase/index';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDoc } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, EggFried, Wheat, Droplets, Trash2, Edit, Plus, Copy, Search, Image as ImageIcon, UploadCloud, Globe, AlertTriangle } from 'lucide-react';
import { NewIngredientDialog, EditableIngredient } from './new-ingredient-dialog';
import { MissingIngredientRow, type ReviewIngredient, type ReviewMacroField } from './ingredient-review';
import { Card, CardContent } from '../ui/card';
import Image from 'next/image';
import { Switch } from '../ui/switch';
import { normalizeText, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CookingModeDialog } from './cooking-mode-dialog';
import { ChefHat } from 'lucide-react';
import { FeatureHint } from './feature-hint';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches storage.rules limit

export type DialogState = DialogStateBase;

interface RecipeDialogProps {
  dialogState: DialogState;
  isSaving?: boolean;
  onClose: () => void;
  onSave?: (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => void;
  onDelete?: (recipeId: string, isGlobal: boolean) => void;
  onEdit?: (recipe: Recipe, isNutriPlannerRecipe?: boolean) => void;
  onCopy?: (recipe: Recipe) => void;
  isMobile?: boolean;
}

const MacroDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: number, unit: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-black/10">
    <Icon className="h-6 w-6 mb-1 text-primary" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-bold">{Math.round(value)}{unit}</span>
  </div>
);

/**
 * Inline two-step delete confirmation. Deliberately NOT a nested AlertDialog:
 * a modal-inside-a-modal that gets torn down when the parent dialog closes
 * leaves Radix's modal counter stuck, locking `body { pointer-events: none }`
 * and freezing the whole app. An inline confirm avoids that class of bug.
 */
function DeleteConfirmButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        <Trash2 className="mr-2 h-4 w-4" /> Borrar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden sm:inline">¿Seguro?</span>
      <Button variant="destructive" size="sm" onClick={onConfirm}>Sí, borrar</Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancelar</Button>
    </div>
  );
}

function RecipeForm({ recipe: initialRecipe, isInitiallyGlobal = false, aiIngredients, initialImageFile, isSaving, onSave, onCancel, onDelete, isMobile }: { recipe?: Partial<Recipe>, isInitiallyGlobal?: boolean, aiIngredients?: AiIngredientEstimate[], initialImageFile?: File, isSaving: boolean, onSave: (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => void, onCancel: () => void, onDelete: (id: string, isGlobal: boolean) => void, isMobile?: boolean }) {
  const isEditing = !!initialRecipe && !!initialRecipe.id;
  const { user, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
  const { data: ingredientDB, isLoading: ingredientsLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);
  
  const ingredientDBMap = useMemo(() => {
    const map = new Map<string, BaseIngredient>();
    if (ingredientDB) {
      ingredientDB.forEach(ing => map.set(normalizeText(ing.name), ing));
    }
    return map;
  }, [ingredientDB]);


  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveAsGlobal, setSaveAsGlobal] = useState(isInitiallyGlobal);
  const [servings, setServings] = useState(1);
  const [category, setCategory] = useState<MealCategory[]>([]);
  const [dietTags, setDietTags] = useState<DietTag[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');

  const [isNewIngredientOpen, setIsNewIngredientOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<BaseIngredient | null>(null);
  const [newIngredientQty, setNewIngredientQty] = useState<number | string>(100);

  const resetForm = useCallback(() => {
    setName(initialRecipe?.name || '');
    setDescription(initialRecipe?.description || '');
    setInstructions(initialRecipe?.instructions || '');
    setIngredients(initialRecipe?.ingredients?.map(ing => ({
        id: ing.id || self.crypto.randomUUID(),
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
    })) || []);
    setImageUrl(initialRecipe?.imageUrl || '');
    setSaveAsGlobal(isInitiallyGlobal);
    // Seed with the photo captured at import (video frame / og:image), if any.
    setImageFile(initialImageFile ?? null);
    setServings(initialRecipe?.servings ?? 1);
    setCategory(initialRecipe?.category ?? []);
    setDietTags(initialRecipe?.dietTags ?? []);
    setSourceUrl(initialRecipe?.sourceUrl || '');
  }, [initialRecipe, isInitiallyGlobal, initialImageFile]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);


  // Live preview: a freshly picked/imported File (object URL) beats the stored
  // imageUrl. Revoke the object URL when it changes to avoid leaks.
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreview(imageUrl || null);
  }, [imageFile, imageUrl]);

  const calculatedTotals = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
        const baseIng = ingredientDBMap.get(normalizeText(ing.name));
        if (!baseIng) return acc;
      
        const scale = ing.quantity / 100;
        acc.calories += (baseIng.calories || 0) * scale;
        acc.protein += (baseIng.protein || 0) * scale;
        acc.carbs += (baseIng.carbs || 0) * scale;
        acc.fat += (baseIng.fat || 0) * scale;
      
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [ingredients, ingredientDBMap]);

  // Per-100g estimates the AI attached to the generated ingredients, keyed by
  // normalized name. Empty for manual create/edit (no review shown then).
  const aiEstimateMap = useMemo(() => {
    const map = new Map<string, AiIngredientEstimate>();
    (aiIngredients ?? []).forEach(e => map.set(normalizeText(e.name), e));
    return map;
  }, [aiIngredients]);

  // Recipe ingredients the AI invented that aren't in the user's DB yet. These
  // are the ones that would otherwise count as 0 kcal — we offer to add them.
  const missingKeys = useMemo(() => {
    if (aiEstimateMap.size === 0) return [];
    const seen = new Set<string>();
    const keys: { key: string; quantity: number; unit: string }[] = [];
    ingredients.forEach(ing => {
      const key = normalizeText(ing.name);
      if (seen.has(key) || ingredientDBMap.has(key) || !aiEstimateMap.has(key)) return;
      seen.add(key);
      keys.push({ key, quantity: ing.quantity, unit: ing.unit });
    });
    return keys;
  }, [ingredients, ingredientDBMap, aiEstimateMap]);

  // Editable review rows for the missing ingredients. Recomputed when the set of
  // missing ingredients changes, but user edits (toggles/macros) are preserved.
  const [reviewIngredients, setReviewIngredients] = useState<ReviewIngredient[]>([]);
  useEffect(() => {
    setReviewIngredients(prev => {
      const prevByKey = new Map(prev.map(r => [normalizeText(r.name), r]));
      return missingKeys.map(({ key, quantity, unit }) => {
        const existing = prevByKey.get(key);
        if (existing) return { ...existing, quantity, unit };
        const est = aiEstimateMap.get(key)!;
        return {
          name: est.name,
          quantity,
          unit,
          calories: Math.round(est.calories),
          protein: Math.round(est.protein),
          carbs: Math.round(est.carbs),
          fat: Math.round(est.fat),
          fiber: Math.round(est.fiber),
          selected: true,
          corrected: est.corrected,
          note: est.note,
        };
      });
    });
  }, [missingKeys, aiEstimateMap]);

  const toggleReviewSelected = (index: number) =>
    setReviewIngredients(prev => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  const updateReviewMacro = (index: number, field: ReviewMacroField, value: number) =>
    setReviewIngredients(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !onSave) return;

    // Category is mandatory: an uncategorised recipe acts as a "wildcard" the AI
    // can drop into any meal slot (e.g. a burger at breakfast). Require at least
    // one so the autocomplete stays sensible.
    if (category.length === 0) {
      toast({ variant: 'destructive', title: 'Falta la categoría', description: 'Marca al menos una categoría de comida (desayuno, almuerzo, cena…) antes de guardar.' });
      return;
    }

    // Persist the new ingredients the user chose to keep, so the recipe's macros
    // count for real (and stay correct when scaled) instead of summing 0 kcal.
    // Mirrors the URL import flow.
    const newIngredients = reviewIngredients.filter(r => r.selected);
    if (newIngredients.length > 0 && ingredientsCollectionRef && user) {
      try {
        await Promise.all(
          newIngredients.map(r =>
            addDoc(ingredientsCollectionRef, {
              name: r.name,
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fat: r.fat,
              fiber: r.fiber,
              createdBy: user.uid,
            })
          )
        );
      } catch (e) {
        console.error('No se pudieron guardar los ingredientes nuevos:', e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar algunos ingredientes nuevos. La receta se guardará igualmente.' });
      }
    }

    // Work out the recipe totals to store. For an AI recipe we sum each
    // ingredient from the DB when present, otherwise from the (possibly edited)
    // review estimate — so newly added ingredients count even before the DB
    // listener catches up. Manual recipes use the DB totals, falling back to the
    // AI-provided ones if nothing resolves.
    const aiFallback = {
      calories: initialRecipe?.calories ?? 0,
      protein: initialRecipe?.protein ?? 0,
      carbs: initialRecipe?.carbs ?? 0,
      fat: initialRecipe?.fat ?? 0,
    };
    let macros: { calories: number; protein: number; carbs: number; fat: number };
    if (aiEstimateMap.size > 0) {
      const reviewByKey = new Map(reviewIngredients.map(r => [normalizeText(r.name), r]));
      const totals = ingredients.reduce((acc, ing) => {
        const key = normalizeText(ing.name);
        const src = ingredientDBMap.get(key) ?? reviewByKey.get(key);
        if (src) {
          const scale = ing.quantity / 100;
          acc.calories += (src.calories || 0) * scale;
          acc.protein += (src.protein || 0) * scale;
          acc.carbs += (src.carbs || 0) * scale;
          acc.fat += (src.fat || 0) * scale;
        }
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      macros = totals.calories > 0 || totals.protein > 0 ? totals : aiFallback;
    } else {
      const hasDbMacros = calculatedTotals.calories > 0 || calculatedTotals.protein > 0;
      macros = hasDbMacros ? calculatedTotals : aiFallback;
    }

    const recipeData: Omit<Recipe, 'id' | 'imageUrl'> & { imageUrl?: string } = {
      name: trimmedName,
      description,
      instructions,
      ingredients,
      imageHint: initialRecipe?.imageHint,
      servings,
      category,
      dietTags,
      // Send the current image URL so the client merge can also CLEAR it (''): if
      // a new file is uploaded, the server action overrides this with the new URL.
      imageUrl,
      // Only persist a valid URL; empty string would fail the schema's .url() check.
      ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
      ...macros
    };

    onSave(recipeData as Omit<Recipe, 'id'>, imageFile, saveAsGlobal, initialRecipe?.id);
  };
  
  const handleSelectIngredient = (ingredient: BaseIngredient) => {
    setSearchQuery('');
    setSelectedIngredient(ingredient);
  };
  
  const addIngredient = () => {
    if (!selectedIngredient) return;

    const newIng: Ingredient = {
      id: self.crypto.randomUUID(),
      name: selectedIngredient.name,
      quantity: Number(newIngredientQty) || 100,
      unit: 'g',
    };

    setIngredients(prev => [...prev, newIng]);
    setSelectedIngredient(null);
    setNewIngredientQty(100);
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };
  
  const handleNewIngredientSave = (ingredientData: EditableIngredient) => {
    if (!ingredientsCollectionRef || !user) return;
    
    const newIngredientWithUser: Omit<BaseIngredient, 'id'> & { createdBy: string } = {
        ...ingredientData,
        createdBy: user.uid,
    };
    
    addDoc(ingredientsCollectionRef, newIngredientWithUser).then(docRef => {
        if (docRef) {
          const newOptimisticIngredient: BaseIngredient = { ...newIngredientWithUser, id: docRef.id };
          setSelectedIngredient(newOptimisticIngredient);
        }
    });

    setIsNewIngredientOpen(false);
  }
  
  const ingredientDisplayList = useMemo(() => {
    return ingredients.map(ing => {
        const baseIng = ingredientDBMap.get(normalizeText(ing.name));
        const scale = ing.quantity / 100;
        const calories = baseIng ? (baseIng.calories || 0) * scale : 0;
        return {
            ...ing,
            calories,
        };
    });
  }, [ingredients, ingredientDBMap]);


  const filteredIngredients = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    if (!normalizedQuery) return [];
    
    return (ingredientDB || [])
        .filter(ingredient => normalizeText(ingredient.name).includes(normalizedQuery))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 5);
  }, [searchQuery, ingredientDB]);


  return (
    <>
      <DialogHeader className={cn(isMobile && 'shrink-0')}>
        <DialogTitle>{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</DialogTitle>
      </DialogHeader>
      <div className={cn(
        'grid md:grid-cols-2 gap-8 py-4',
        isMobile && 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1 gap-4'
      )}>
        <div className="space-y-4 min-w-0">
          <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <Label htmlFor="name">Nombre de la Receta</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="servings">Raciones que produce</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                value={servings}
                onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
           <div>
              <Label htmlFor="imageFile">Foto de la receta</Label>
              <div className="mt-1 space-y-2">
                {imagePreview ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Vista previa de la receta" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImageUrl(''); }}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                      aria-label="Quitar foto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="imageFile"
                    className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent/20"
                  >
                    <UploadCloud className="h-8 w-8" />
                    <span className="text-sm">Añadir una foto (opcional)</span>
                    <span className="text-[11px]">JPG, PNG o WebP · máx. 5 MB</span>
                  </label>
                )}
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className={cn(imagePreview ? 'block' : 'sr-only')}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_IMAGE_BYTES) {
                      toast({ variant: 'destructive', title: 'Imagen demasiado grande', description: 'La imagen supera los 5 MB. Usa una más ligera.' });
                      e.target.value = '';
                      return;
                    }
                    setImageFile(file);
                  }}
                />
              </div>
             </div>
           <FeatureHint
              id="recipe-category"
              title="Categoría y dieta"
              text="Marca a qué comidas pertenece la receta y qué dietas cumple. La IA lo usa para montar el menú sin equivocarse."
              side="top"
              align="start"
            >
             <div>
              <Label>Categoría de comida <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {MEAL_CATEGORIES.map((cat) => {
                  const isOn = category.includes(cat.value);
                  return (
                    <Button
                      key={cat.value}
                      type="button"
                      size="sm"
                      variant={isOn ? 'default' : 'secondary'}
                      className="rounded-full h-7 text-xs"
                      onClick={() => setCategory(prev =>
                        prev.includes(cat.value)
                          ? prev.filter(c => c !== cat.value)
                          : [...prev, cat.value]
                      )}
                    >
                      {cat.label}
                    </Button>
                  );
                })}
              </div>
              <p className={cn('text-xs mt-1', category.length === 0 ? 'text-destructive' : 'text-muted-foreground')}>
                Obligatorio: marca al menos una comida. La IA lo usa para montar el menú sin equivocarse.
              </p>
            </div>
           </FeatureHint>
           <div>
              <Label>Dieta</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DIET_TAGS.map((diet) => {
                  const isOn = dietTags.includes(diet.value);
                  return (
                    <Button
                      key={diet.value}
                      type="button"
                      size="sm"
                      variant={isOn ? 'default' : 'secondary'}
                      className="rounded-full h-7 text-xs"
                      onClick={() => setDietTags(prev =>
                        prev.includes(diet.value)
                          ? prev.filter(d => d !== diet.value)
                          : [...prev, diet.value]
                      )}
                    >
                      {diet.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Para que la IA respete tu dieta. Vacío = sin restricción dietética.
              </p>
            </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sourceUrl">URL de origen (vídeo o receta)</Label>
            <Input
              id="sourceUrl"
              type="url"
              inputMode="url"
              placeholder="https://www.instagram.com/... · TikTok · YouTube"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Opcional. Guarda el enlace al post o vídeo para poder volver a verlo desde la receta.
            </p>
          </div>
          <div>
            <Label htmlFor="instructions">Instrucciones</Label>
            <Textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} className="h-48" />
          </div>
        </div>
        <div className="space-y-4 min-w-0">
            <div className="space-y-3">
                <Label>Ingredientes</Label>
                <Card className="bg-transparent">
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                             <Label>1. Buscar y añadir ingrediente</Label>
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar ingrediente..."
                                    className="pl-10"
                                />
                             </div>
                            {searchQuery && (
                                <Card className="p-2 bg-glass">
                                    {filteredIngredients.length > 0 ? (
                                        filteredIngredients.map((ing) => (
                                            <div key={ing.id} onClick={() => handleSelectIngredient(ing)} className="p-2 hover:bg-black/10 rounded-md cursor-pointer text-sm">
                                                {ing.name}
                                            </div>
                                        ))
                                    ) : !ingredientsLoading && (
                                        <div className="p-4 text-sm text-center">
                                            <p>No se encontraron resultados.</p>
                                            <Button variant="link" className="h-auto p-0 mt-1" onClick={() => { setIsNewIngredientOpen(true); }}>
                                                Crear nuevo alimento
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            )}
                        </div>

                        {selectedIngredient && (
                            <div className="flex gap-2 items-end bg-black/10 p-2 rounded-md">
                                <div className="flex-1 min-w-0">
                                    <Label className="text-xs">Ingrediente seleccionado</Label>
                                    <p className="font-semibold truncate">{selectedIngredient.name}</p>
                                </div>
                                <div className="w-20 shrink-0">
                                    <Label htmlFor='qty' className="text-xs">Cant. (g)</Label>
                                    <Input id='qty' type="number" value={newIngredientQty} onChange={e => setNewIngredientQty(e.target.value)} />
                                </div>
                                <Button size="icon" className="shrink-0" onClick={addIngredient}><Plus className="h-4 w-4" /></Button>
                            </div>
                        )}
                        
                        <div className='space-y-2'>
                            <Label>2. Ingredientes de la Receta</Label>
                            <ScrollArea className="h-36 border border-white/10 rounded-lg p-2">
                                <div className="space-y-2 pr-2">
                                    {ingredientDisplayList.map(ing => (
                                    <div key={ing.id} className="flex items-center justify-between gap-2 bg-black/10 p-2 rounded-md text-sm">
                                        <span className="truncate min-w-0">{ing.quantity}{ing.unit} <strong>{ing.name}</strong></span>
                                        <div className='flex items-center gap-2 shrink-0'>
                                            <span className='text-xs text-muted-foreground whitespace-nowrap'>{Math.round(ing.calories)} kcal</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIngredient(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center pt-8">Añade ingredientes para verlos aquí.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {reviewIngredients.length > 0 && (
              <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Ingredientes nuevos ({reviewIngredients.length})</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  La IA creó estos alimentos pero no están en tu base de datos. Revisa los macros estimados (por 100g) y márcalos para añadirlos; así contarán de verdad en la receta en vez de sumar 0 kcal.
                </p>
                <div className="space-y-2">
                  {reviewIngredients.map((ing, index) => (
                    <MissingIngredientRow
                      key={normalizeText(ing.name)}
                      ing={ing}
                      onToggle={() => toggleReviewSelected(index)}
                      onMacroChange={(field, value) => updateReviewMacro(index, field, value)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
                 <Label>Totales de la Receta</Label>
                <div className="grid grid-cols-4 gap-2 text-center mt-1">
                    <MacroDisplay label="Calorías" value={calculatedTotals.calories} unit="kcal" icon={Flame} />
                    <MacroDisplay label="Proteína" value={calculatedTotals.protein} unit="g" icon={EggFried} />
                    <MacroDisplay label="Carbs" value={calculatedTotals.carbs} unit="g" icon={Wheat} />
                    <MacroDisplay label="Grasa" value={calculatedTotals.fat} unit="g" icon={Droplets} />
                </div>
            </div>
             {isAdmin && (
                <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                        <Label htmlFor="global-recipe-switch">Guardar en el recetario base</Label>
                        <p className="text-xs text-muted-foreground">Estará disponible para todos los usuarios como receta base.</p>
                    </div>
                    <Switch
                        id="global-recipe-switch"
                        checked={saveAsGlobal}
                        onCheckedChange={setSaveAsGlobal}
                    />
                </div>
            )}

        </div>
      </div>
      <DialogFooter className={cn('justify-between pt-4', isMobile && 'shrink-0 border-t mt-0 bg-glass')}>
        {isEditing && initialRecipe?.id && onDelete ? (
            <DeleteConfirmButton onConfirm={() => onDelete(initialRecipe?.id as string, saveAsGlobal)} />
        ) : <div></div> }
        <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Guardando...' : 'Guardar Receta'}
            </Button>
        </div>
      </DialogFooter>
      <NewIngredientDialog
        isOpen={isNewIngredientOpen}
        onClose={() => setIsNewIngredientOpen(false)}
        onSave={handleNewIngredientSave}
      />
    </>
  );
}


function RecipeView({ recipe, onEdit, onDelete, onCopy, isNutriPlannerRecipe, isMobile }: { recipe: Recipe; onEdit?: (recipe: Recipe, isNutriPlannerRecipe?: boolean) => void; onDelete?: (id: string, isGlobal: boolean) => void; onCopy?: (recipe: Recipe) => void; isNutriPlannerRecipe: boolean; isMobile?: boolean; }) {
  const { user, isAdmin } = useUser();
  const firestore = useFirestore();
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);

  const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
  const { data: ingredientDB } = useCollection<BaseIngredient>(ingredientsCollectionRef);
  
  const ingredientDBMap = useMemo(() => {
    const map = new Map<string, BaseIngredient>();
    if (ingredientDB) {
      ingredientDB.forEach(ing => map.set(normalizeText(ing.name), ing));
    }
    return map;
  }, [ingredientDB]);

  const canEdit = isAdmin || !isNutriPlannerRecipe;

  return (
     <>
      <DialogHeader className={cn('mb-4', isMobile && 'shrink-0 mb-2')}>
        <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <DialogDescription>{recipe.description}</DialogDescription>
          {(recipe.category ?? []).map((cat) => (
            <span key={cat} className="bg-primary/15 text-primary px-2 py-1 rounded-md text-xs font-medium">
              {MEAL_CATEGORY_LABELS[cat] ?? cat}
            </span>
          ))}
          {(recipe.dietTags ?? []).map((diet) => (
            <span key={diet} className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md text-xs font-medium">
              {DIET_TAG_LABELS[diet] ?? diet}
            </span>
          ))}
        </div>
      </DialogHeader>
      <div className={cn('grid md:grid-cols-2 gap-6', isMobile && 'flex-1 min-h-0 overflow-y-auto -mx-1 px-1')}>
        <div>
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-black/10 flex items-center justify-center text-muted-foreground">
             {recipe.imageUrl ? (
              <Image 
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                sizes="50vw"
                className="object-cover"
                data-ai-hint={recipe.imageHint}
              />
            ) : (
                <div className="text-center">
                    <ImageIcon className="h-10 w-10 mx-auto" />
                    <p>No hay imagen</p>
                </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <MacroDisplay label="Calorías" value={recipe.calories} unit="kcal" icon={Flame} />
            <MacroDisplay label="Proteína" value={recipe.protein} unit="g" icon={EggFried} />
            <MacroDisplay label="Carbs" value={recipe.carbs} unit="g" icon={Wheat} />
            <MacroDisplay label="Grasa" value={recipe.fat} unit="g" icon={Droplets} />
          </div>
          {(recipe.servings ?? 1) > 1 && (
            <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Por ración (1 de {recipe.servings})</p>
              <div className="flex justify-around text-sm font-medium">
                <span className="text-orange-500">{Math.round(recipe.calories / recipe.servings!)} kcal</span>
                <span className="text-amber-500">{Math.round(recipe.protein / recipe.servings!)}g prot</span>
                <span className="text-yellow-500">{Math.round(recipe.carbs / recipe.servings!)}g carbs</span>
                <span className="text-sky-500">{Math.round(recipe.fat / recipe.servings!)}g grasa</span>
              </div>
            </div>
          )}
        </div>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Ingredientes</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {recipe.ingredients.map(ing => {
                  // Always look up the ingredient in the DB map to get live macros
                  const baseIng = ingredientDBMap.get(normalizeText(ing.name));
                  const scale = baseIng ? ing.quantity / 100 : 0;
                  const calories = baseIng ? (baseIng.calories || 0) * scale : 0;
                  return (
                    <li key={ing.id}>
                        {ing.quantity}{ing.unit} {ing.name}
                        {baseIng && <span className="text-xs text-muted-foreground ml-2">({Math.round(calories)} kcal)</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Instrucciones</h3>
              <p className="text-sm whitespace-pre-wrap">{recipe.instructions}</p>
            </div>
            {recipe.sourceUrl && (
              <div>
                <h3 className="font-semibold mb-2">Fuente</h3>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  Ver receta original / vídeo
                </a>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      <DialogFooter className={cn('mt-6 flex flex-row justify-between items-center w-full', isMobile && 'shrink-0 mt-2 pt-3 border-t bg-glass')}>
         <div className="flex gap-2">
            {onDelete && canEdit && (
              <DeleteConfirmButton onConfirm={() => onDelete(recipe.id, isNutriPlannerRecipe)} />
            )}
         </div>

        <div className='flex gap-2'>
          <Button variant="default" onClick={() => setIsCookingModeOpen(true)}>
            <ChefHat className="mr-2 h-4 w-4" /> Cocinar
          </Button>
          {/* Note: if 'isNutriPlannerRecipe' is true, we ONLY show the copy button (which behaves like clone) when 'onCopy' is available. Wait, we want to clone ANY recipe. The user requested 'Clone' button universally. */}
          {onCopy && (
            <Button variant="outline" onClick={() => onCopy(recipe)}>
              <Copy className="mr-2 h-4 w-4" /> Clonar / Usar Plantilla
            </Button>
          )}
          {canEdit && onEdit && (
            <Button variant="outline" onClick={() => onEdit(recipe, isNutriPlannerRecipe)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </DialogFooter>

      <CookingModeDialog 
        recipe={recipe} 
        isOpen={isCookingModeOpen} 
        onClose={() => setIsCookingModeOpen(false)} 
      />
    </>
  )
}


export function RecipeDialog({ dialogState, isSaving = false, onClose, onSave, onDelete, onEdit, onCopy, isMobile }: RecipeDialogProps) {
  const open = dialogState.open;

  // Radix locks `document.body { pointer-events: none }` while a modal is open and
  // restores it on close. When the nested delete-confirmation AlertDialog and this
  // dialog unmount in the same tick (deleting a recipe closes the dialog), that
  // restore can be skipped — leaving the whole app unclickable ("frozen"/crashed).
  // Defensively clear the lock once this dialog has closed.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      if (typeof document !== 'undefined') document.body.style.pointerEvents = '';
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const handleEdit = (recipe: Recipe) => {
    if (onEdit && dialogState.open) {
      onEdit(recipe, dialogState.mode === 'view' ? dialogState.isNutriPlannerRecipe : false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={cn(
        "max-w-4xl bg-glass",
        isMobile && "h-[90dvh] flex flex-col gap-2"
        )}>
        {dialogState.open && (
          dialogState.mode === 'view' && dialogState.recipe ? (
            <RecipeView
              recipe={dialogState.recipe}
              onEdit={handleEdit}
              onDelete={onDelete}
              onCopy={onCopy}
              isNutriPlannerRecipe={!!dialogState.isNutriPlannerRecipe}
              isMobile={isMobile}
            />
          ) : (
            <RecipeForm
              recipe={dialogState.mode === 'edit' || (dialogState.mode === 'create' && dialogState.recipe) ? dialogState.recipe : undefined}
              isInitiallyGlobal={dialogState.mode === 'edit' ? dialogState.isNutriPlannerRecipe : false}
              aiIngredients={dialogState.mode === 'create' ? dialogState.aiIngredients : undefined}
              initialImageFile={dialogState.mode === 'create' ? dialogState.imageFile : undefined}
              isSaving={isSaving}
              onSave={onSave!}
              onCancel={onClose}
              onDelete={onDelete!}
              isMobile={isMobile}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
