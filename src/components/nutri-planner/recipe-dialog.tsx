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
import { Flame, EggFried, Wheat, Droplets, Trash2, Edit, Plus, Copy, Search, Image as ImageIcon, UploadCloud, Globe, AlertTriangle, ScanBarcode, PackageSearch, LoaderCircle } from 'lucide-react';
import { searchOffProducts, getOffProductByBarcode, type OffProduct } from '@/lib/open-food-facts';
import { BarcodeScannerDialog } from './barcode-scanner-dialog';
import { NewIngredientDialog, EditableIngredient } from './new-ingredient-dialog';
import { MissingIngredientRow, type ReviewIngredient, type ReviewMacroField } from './ingredient-review';
import { Card, CardContent } from '../ui/card';
import Image from 'next/image';
import { Switch } from '../ui/switch';
import { normalizeText, ingredientKey, pluralizeUnit, cn } from '@/lib/utils';
import { findSimilarIngredient } from '@/lib/ingredient-similarity';
import { useToast } from '@/hooks/use-toast';
import { CookingModeDialog } from './cooking-mode-dialog';
import { ChefHat } from 'lucide-react';
import { FeatureHint } from './feature-hint';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches storage.rules limit

/**
 * Builds the lookup map from the ingredient DB. Keyed primarily by name+brand
 * (`ingredientKey`) so same-named products of different brands stay distinct,
 * with a name-only fallback entry so recipe ingredients saved before brands
 * existed still resolve.
 */
function buildIngredientDBMap(ingredientDB: BaseIngredient[] | null | undefined) {
  const map = new Map<string, BaseIngredient>();
  (ingredientDB ?? []).forEach(ing => {
    map.set(ingredientKey(ing.name, ing.brand), ing);
    const nameOnly = normalizeText(ing.name);
    if (!map.has(nameOnly)) map.set(nameOnly, ing);
  });
  return map;
}

/** Resolves a recipe ingredient to its base ingredient: name+brand, then name. */
function lookupBaseIngredient(
  map: Map<string, BaseIngredient>,
  name: string,
  brand?: string,
): BaseIngredient | undefined {
  return map.get(ingredientKey(name, brand)) ?? map.get(normalizeText(name));
}

/**
 * Grams a recipe ingredient represents, for macro maths (macros are per 100g).
 * 'g'/'ml' → the quantity itself. A piece unit (e.g. "loncha") multiplies the
 * count by grams-per-piece, taken from the snapshot on the ingredient or, for
 * older recipes, from the matching base ingredient. Legacy free-text units with
 * no known weight fall back to treating the quantity as grams (prior behaviour).
 */
function ingredientGrams(ing: Ingredient, baseIng?: BaseIngredient): number {
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'ml' || unit === '') return ing.quantity;
  const weight =
    ing.unitWeight ??
    (baseIng?.unitName && normalizeText(baseIng.unitName) === normalizeText(ing.unit)
      ? baseIng.unitWeight
      : undefined);
  return weight ? ing.quantity * weight : ing.quantity;
}

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

  const ingredientDBMap = useMemo(() => buildIngredientDBMap(ingredientDB), [ingredientDB]);


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
  // How the quantity above is expressed: grams, or pieces of the selected
  // ingredient's natural unit (only offered when it defines one).
  const [addByUnit, setAddByUnit] = useState(false);
  // Open Food Facts results shown INLINE in the same search dropdown, so the
  // user never has to know there are two food sources. null = not searched yet.
  const [offResults, setOffResults] = useState<OffProduct[] | null>(null);
  const [isOffLoading, setIsOffLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const resetForm = useCallback(() => {
    setName(initialRecipe?.name || '');
    setDescription(initialRecipe?.description || '');
    setInstructions(initialRecipe?.instructions || '');
    setIngredients(initialRecipe?.ingredients?.map(ing => ({
        id: ing.id || self.crypto.randomUUID(),
        name: ing.name,
        // Preserve the brand so editing a recipe keeps the product identity.
        ...(ing.brand ? { brand: ing.brand } : {}),
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
        const baseIng = lookupBaseIngredient(ingredientDBMap, ing.name, ing.brand);
        if (!baseIng) return acc;

        const scale = ingredientGrams(ing, baseIng) / 100;
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

  // Probable duplicates: for each "new" ingredient, an existing DB food with the
  // same plural-folded name (or very close). Offered as "usar existente".
  const reviewSimilarByName = useMemo(() => {
    const map = new Map<string, BaseIngredient>();
    reviewIngredients.forEach(r => {
      const similar = findSimilarIngredient(r.name, ingredientDB ?? []);
      if (similar) map.set(normalizeText(r.name), similar);
    });
    return map;
  }, [reviewIngredients, ingredientDB]);

  // "Usar existente": rename the recipe ingredient to the DB food's exact
  // name(+brand). The row then stops being "missing" and macros resolve for real.
  const applyExistingIngredient = (reviewName: string, existing: BaseIngredient) => {
    setIngredients(prev => prev.map(i =>
      normalizeText(i.name) === normalizeText(reviewName)
        ? { ...i, name: existing.name, ...(existing.brand ? { brand: existing.brand } : {}) }
        : i
    ));
  };

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
        const dbIng = lookupBaseIngredient(ingredientDBMap, ing.name, ing.brand);
        const src = dbIng ?? reviewByKey.get(normalizeText(ing.name));
        if (src) {
          const scale = ingredientGrams(ing, dbIng) / 100;
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
  
  // Selecting an ingredient defaults the quantity input to its natural unit when
  // it has one (1 piece), otherwise to 100 g — whichever the user is more likely
  // to want.
  const chooseIngredient = (ingredient: BaseIngredient) => {
    const hasUnit = !!(ingredient.unitName && ingredient.unitWeight);
    setSelectedIngredient(ingredient);
    setAddByUnit(hasUnit);
    setNewIngredientQty(hasUnit ? 1 : 100);
  };

  const handleSelectIngredient = (ingredient: BaseIngredient) => {
    setSearchQuery('');
    setOffResults(null);
    chooseIngredient(ingredient);
  };

  const runOffSearch = async () => {
    const q = searchQuery.trim();
    if (!q || isOffLoading) return;
    setIsOffLoading(true);
    try {
      setOffResults(await searchOffProducts(q));
    } catch (e) {
      console.error('OFF search failed:', e);
      toast({ variant: 'destructive', title: 'Buscador no disponible', description: 'Open Food Facts no responde ahora mismo. Escanea el código de barras o crea el alimento a mano.' });
    } finally {
      setIsOffLoading(false);
    }
  };

  // Picking an OFF product reuses the matching DB ingredient when one exists
  // (same name + brand) or silently creates it with the per-100g macros — one
  // tap instead of the old search → crear alimento → OFF → save dance. The brand
  // is stored in its own field (not baked into the name) so it shows separately.
  const selectOffProduct = async (p: OffProduct) => {
    const existing =
      ingredientDBMap.get(ingredientKey(p.name, p.brand)) ??
      // Back-compat: older entries baked the brand into the name as "name (brand)".
      (p.brand ? ingredientDBMap.get(normalizeText(`${p.name} (${p.brand})`)) : undefined);
    if (existing) {
      chooseIngredient(existing);
    } else {
      if (!ingredientsCollectionRef || !user) return;
      const data = {
        name: p.name,
        ...(p.brand ? { brand: p.brand } : {}),
        calories: Math.round(p.per100g.calories),
        protein: Math.round(p.per100g.protein * 10) / 10,
        carbs: Math.round(p.per100g.carbs * 10) / 10,
        fat: Math.round(p.per100g.fat * 10) / 10,
        fiber: Math.round(p.per100g.fiber * 10) / 10,
        createdBy: user.uid,
      };
      try {
        const docRef = await addDoc(ingredientsCollectionRef, data);
        chooseIngredient({ ...data, id: docRef.id });
      } catch (e) {
        console.error('No se pudo crear el alimento desde OFF:', e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el alimento. Inténtalo de nuevo.' });
        return;
      }
    }
    setSearchQuery('');
    setOffResults(null);
  };

  const handleBarcodeDetected = async (code: string) => {
    setIsOffLoading(true);
    try {
      const product = await getOffProductByBarcode(code);
      if (product) await selectOffProduct(product);
      else toast({ title: 'Producto no encontrado', description: `El código ${code} no está en Open Food Facts. Créalo a mano.` });
    } catch (e) {
      console.error('OFF barcode lookup failed:', e);
      toast({ variant: 'destructive', title: 'Open Food Facts no responde', description: 'Inténtalo de nuevo en unos segundos.' });
    } finally {
      setIsOffLoading(false);
    }
  };
  
  const addIngredient = () => {
    if (!selectedIngredient) return;

    const useUnit = addByUnit && !!(selectedIngredient.unitName && selectedIngredient.unitWeight);
    const qty = Number(newIngredientQty) || (useUnit ? 1 : 100);

    const newIng: Ingredient = {
      id: self.crypto.randomUUID(),
      name: selectedIngredient.name,
      // Carry the brand so this exact product resolves later (and shows apart).
      ...(selectedIngredient.brand ? { brand: selectedIngredient.brand } : {}),
      quantity: qty,
      // Piece unit: store its name + grams-per-piece snapshot; else grams.
      ...(useUnit
        ? { unit: selectedIngredient.unitName!, unitWeight: selectedIngredient.unitWeight! }
        : { unit: 'g' }),
    };

    setIngredients(prev => [...prev, newIng]);
    setSelectedIngredient(null);
    setNewIngredientQty(100);
    setAddByUnit(false);
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  // Modify an already-added ingredient's quantity inline (empty = keep editing).
  const updateIngredientQuantity = (id: string, value: string) => {
    const parsed = value === '' ? 0 : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setIngredients(prev => prev.map(i => (i.id === id ? { ...i, quantity: parsed } : i)));
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
          chooseIngredient(newOptimisticIngredient);
        }
    });

    setIsNewIngredientOpen(false);
  }
  
  const ingredientDisplayList = useMemo(() => {
    return ingredients.map(ing => {
        const baseIng = lookupBaseIngredient(ingredientDBMap, ing.name, ing.brand);
        const grams = ingredientGrams(ing, baseIng);
        const scale = grams / 100;
        const calories = baseIng ? (baseIng.calories || 0) * scale : 0;
        // Prefer the brand stored on the recipe ingredient; fall back to the DB.
        return {
            ...ing,
            brand: ing.brand ?? baseIng?.brand,
            grams,
            calories,
        };
    });
  }, [ingredients, ingredientDBMap]);


  const filteredIngredients = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    if (!normalizedQuery) return [];
    
    return (ingredientDB || [])
        .filter(ingredient =>
          normalizeText(ingredient.name).includes(normalizedQuery) ||
          (ingredient.brand ? normalizeText(ingredient.brand).includes(normalizedQuery) : false)
        )
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
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setOffResults(null); }}
                                        placeholder="Buscar alimento..."
                                        className="pl-10"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runOffSearch(); } }}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    title="Escanear código de barras"
                                    onClick={() => setIsScannerOpen(true)}
                                >
                                    <ScanBarcode className="h-4 w-4" />
                                </Button>
                             </div>
                            {searchQuery && (
                                <Card className="p-2 bg-glass">
                                    {/* Local ingredient DB matches */}
                                    {filteredIngredients.map((ing) => (
                                        <div key={ing.id} onClick={() => handleSelectIngredient(ing)} className="p-2 hover:bg-black/10 rounded-md cursor-pointer text-sm">
                                            <span className="leading-tight">{ing.name}</span>
                                            {ing.brand && <span className="ml-2 text-xs text-muted-foreground">{ing.brand}</span>}
                                        </div>
                                    ))}
                                    {filteredIngredients.length === 0 && !ingredientsLoading && offResults === null && (
                                        <p className="p-2 text-sm text-muted-foreground text-center">Nada en tus alimentos guardados.</p>
                                    )}

                                    {/* Open Food Facts, inline in the same list */}
                                    {offResults === null ? (
                                        <button
                                            type="button"
                                            onClick={runOffSearch}
                                            disabled={isOffLoading}
                                            className="w-full flex items-center gap-2 p-2 rounded-md text-sm text-primary hover:bg-black/10 disabled:opacity-60"
                                        >
                                            {isOffLoading
                                                ? <LoaderCircle className="h-4 w-4 animate-spin shrink-0" />
                                                : <PackageSearch className="h-4 w-4 shrink-0" />}
                                            Buscar «{searchQuery.trim()}» en Open Food Facts
                                        </button>
                                    ) : offResults.length === 0 ? (
                                        <p className="p-2 text-xs text-muted-foreground text-center">
                                            Sin resultados en Open Food Facts.
                                        </p>
                                    ) : (
                                        <>
                                            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                Open Food Facts (por 100 g)
                                            </p>
                                            {offResults.slice(0, 6).map((p, i) => (
                                                <div
                                                    key={p.barcode ?? `${p.name}-${i}`}
                                                    onClick={() => selectOffProduct(p)}
                                                    className="flex items-center gap-2 p-2 hover:bg-black/10 rounded-md cursor-pointer"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm leading-tight line-clamp-1">{p.name}</p>
                                                        {p.brand && <p className="text-xs text-muted-foreground line-clamp-1">{p.brand}</p>}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground shrink-0">
                                                        {Math.round(p.per100g.calories)} kcal
                                                    </span>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    <Button variant="link" className="h-auto p-2 text-xs" onClick={() => { setIsNewIngredientOpen(true); }}>
                                        Crear alimento a mano
                                    </Button>
                                </Card>
                            )}
                        </div>

                        {selectedIngredient && (() => {
                            const hasUnit = !!(selectedIngredient.unitName && selectedIngredient.unitWeight);
                            const unitMode = addByUnit && hasUnit;
                            const count = Number(newIngredientQty) || 0;
                            const grams = unitMode ? count * (selectedIngredient.unitWeight ?? 0) : count;
                            return (
                              <div className="bg-black/10 p-2 rounded-md space-y-2">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 min-w-0">
                                        <Label className="text-xs">Ingrediente seleccionado</Label>
                                        <p className="font-semibold truncate leading-tight">{selectedIngredient.name}</p>
                                        {selectedIngredient.brand && <p className="text-xs text-muted-foreground truncate leading-tight">{selectedIngredient.brand}</p>}
                                    </div>
                                    <div className="w-20 shrink-0">
                                        <Label htmlFor='qty' className="text-xs">{unitMode ? 'Cant.' : 'Cant. (g)'}</Label>
                                        <Input id='qty' type="number" inputMode="decimal" value={newIngredientQty} onChange={e => setNewIngredientQty(e.target.value)} />
                                    </div>
                                    <Button size="icon" className="shrink-0" aria-label="Añadir ingrediente" onClick={addIngredient}><Plus className="h-4 w-4" /></Button>
                                </div>
                                {/* Unit toggle + live conversion, only when the food defines a unit. */}
                                {hasUnit && (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex rounded-md border border-white/10 overflow-hidden text-xs">
                                        <button type="button" onClick={() => { setAddByUnit(false); setNewIngredientQty(100); }} className={cn('px-2 py-1', !unitMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>gramos</button>
                                        <button type="button" onClick={() => { setAddByUnit(true); setNewIngredientQty(1); }} className={cn('px-2 py-1', unitMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{pluralizeUnit(selectedIngredient.unitName!, 2)}</button>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {unitMode
                                          ? `${count || 0} ${pluralizeUnit(selectedIngredient.unitName!, count)} = ${Math.round(grams)} g`
                                          : `1 ${selectedIngredient.unitName} = ${selectedIngredient.unitWeight} g`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                        })()}
                        
                        <div className='space-y-2'>
                            <Label>2. Ingredientes de la Receta</Label>
                            <ScrollArea className="h-36 border border-white/10 rounded-lg p-2">
                                <div className="space-y-2 pr-2">
                                    {ingredientDisplayList.map(ing => {
                                    const isPiece = ing.unit && !['g', 'ml'].includes(ing.unit.toLowerCase());
                                    return (
                                    <div key={ing.id} className="flex items-center gap-2 bg-black/10 p-2 rounded-md text-sm">
                                        {/* Name + brand truncate; the controls on the right never shrink,
                                            so the delete button is always reachable even for long names. */}
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-semibold leading-tight">{ing.name}</p>
                                            {ing.brand && <p className="truncate text-xs text-muted-foreground leading-tight">{ing.brand}</p>}
                                            <p className="text-xs text-muted-foreground">
                                              {Math.round(ing.calories)} kcal
                                              {isPiece && ing.grams > 0 && ` · ${Math.round(ing.grams)} g`}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-1 shrink-0'>
                                            <Input
                                              type="number"
                                              inputMode="decimal"
                                              aria-label={`Cantidad de ${ing.name}`}
                                              value={ing.quantity}
                                              onChange={e => updateIngredientQuantity(ing.id, e.target.value)}
                                              className="h-8 w-16 px-1 text-center"
                                            />
                                            <span className="text-xs text-muted-foreground min-w-8">{isPiece ? pluralizeUnit(ing.unit, ing.quantity) : ing.unit}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" aria-label={`Quitar ${ing.name}`} onClick={() => removeIngredient(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    );
                                    })}
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
                  {reviewIngredients.map((ing, index) => {
                    const similar = reviewSimilarByName.get(normalizeText(ing.name));
                    return (
                      <MissingIngredientRow
                        key={normalizeText(ing.name)}
                        ing={ing}
                        onToggle={() => toggleReviewSelected(index)}
                        onMacroChange={(field, value) => updateReviewMacro(index, field, value)}
                        similar={similar}
                        onUseExisting={similar ? () => applyExistingIngredient(ing.name, similar) : undefined}
                      />
                    );
                  })}
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
                {servings > 1 && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Por ración ({servings} raciones): {Math.round(calculatedTotals.calories / servings)} kcal ·{' '}
                    {Math.round(calculatedTotals.protein / servings)}g prot
                  </p>
                )}
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
      <BarcodeScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleBarcodeDetected}
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
  
  const ingredientDBMap = useMemo(() => buildIngredientDBMap(ingredientDB), [ingredientDB]);

  const canEdit = isAdmin || !isNutriPlannerRecipe;

  const categoryBadges = (recipe.category ?? []).map((cat) => (
    <span key={cat} className={cn('bg-primary/15 text-primary rounded-md font-medium', isMobile ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-1 text-xs')}>
      {MEAL_CATEGORY_LABELS[cat] ?? cat}
    </span>
  ));
  const dietBadges = (recipe.dietTags ?? []).map((diet) => (
    <span key={diet} className={cn('bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md font-medium', isMobile ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-1 text-xs')}>
      {DIET_TAG_LABELS[diet] ?? diet}
    </span>
  ));

  // Shared between mobile and desktop; only the wrapper (plain flow vs. its own
  // ScrollArea) differs — see below.
  const ingredientsAndInstructions = (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Ingredientes</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {recipe.ingredients.map(ing => {
            // Always look up the ingredient in the DB map to get live macros
            const baseIng = lookupBaseIngredient(ingredientDBMap, ing.name, ing.brand);
            const grams = ingredientGrams(ing, baseIng);
            const scale = baseIng ? grams / 100 : 0;
            const calories = baseIng ? (baseIng.calories || 0) * scale : 0;
            const brand = ing.brand ?? baseIng?.brand;
            // For piece units, also show the gram equivalent (e.g. "2 lonchas · 60 g").
            const isPiece = ing.unit && !['g', 'ml'].includes(ing.unit.toLowerCase());
            return (
              <li key={ing.id}>
                  {ing.quantity} {isPiece ? pluralizeUnit(ing.unit, ing.quantity) : ing.unit} {ing.name}
                  {isPiece && grams > 0 && <span className="text-xs text-muted-foreground ml-1">· {Math.round(grams)} g</span>}
                  {brand && <span className="text-xs text-muted-foreground ml-1">· {brand}</span>}
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
  );

  return (
     <>
      <DialogHeader className={cn('mb-4', isMobile && 'shrink-0 mb-2')}>
        <DialogTitle className={cn('text-2xl', isMobile && 'text-lg leading-snug')}>{recipe.name}</DialogTitle>
        {isMobile ? (
          <div className="space-y-1.5">
            {recipe.description && (
              <DialogDescription className="text-sm line-clamp-2">{recipe.description}</DialogDescription>
            )}
            {(categoryBadges.length > 0 || dietBadges.length > 0) && (
              <div className="flex flex-wrap gap-1.5">{categoryBadges}{dietBadges}</div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <DialogDescription>{recipe.description}</DialogDescription>
            {categoryBadges}
            {dietBadges}
          </div>
        )}
      </DialogHeader>
      <div className={cn('grid md:grid-cols-2 gap-6', isMobile && 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1')}>
        <div className="min-w-0">
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
          {/* Per-serving values lead: they're what actually lands on a plate and
              what the plan counts. The whole-batch total is the secondary note. */}
          {(() => {
            const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
            return (
              <>
                {servings > 1 && (
                  <p className="text-xs text-muted-foreground text-center mb-1">
                    Valores por ración · la receta rinde {servings} raciones
                  </p>
                )}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <MacroDisplay label="Calorías" value={recipe.calories / servings} unit="kcal" icon={Flame} />
                  <MacroDisplay label="Proteína" value={recipe.protein / servings} unit="g" icon={EggFried} />
                  <MacroDisplay label="Carbs" value={recipe.carbs / servings} unit="g" icon={Wheat} />
                  <MacroDisplay label="Grasa" value={recipe.fat / servings} unit="g" icon={Droplets} />
                </div>
                {servings > 1 && (
                  <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xs text-muted-foreground">
                      Receta completa ({servings} raciones): {Math.round(recipe.calories)} kcal ·{' '}
                      {Math.round(recipe.protein)}g prot · {Math.round(recipe.carbs)}g carbs ·{' '}
                      {Math.round(recipe.fat)}g grasa
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        {/* Mobile: the outer grid already scrolls the whole column, so this flows
            with it instead of nesting a second, independently-scrolling box. */}
        {isMobile ? (
          <div className="min-w-0">{ingredientsAndInstructions}</div>
        ) : (
          <ScrollArea className="h-96">{ingredientsAndInstructions}</ScrollArea>
        )}
      </div>
      {isMobile ? (
        // Mobile: a clear hierarchy instead of one flat row — primary action full
        // width on top, secondary actions evenly split below, destructive action
        // smallest and last (it was rendering full-width and first, which made
        // "Borrar" look like the main action).
        <DialogFooter className="mt-2 pt-3 border-t bg-glass shrink-0 flex flex-col gap-2 w-full">
          <Button variant="default" className="w-full" onClick={() => setIsCookingModeOpen(true)}>
            <ChefHat className="mr-2 h-4 w-4" /> Cocinar
          </Button>
          {(onCopy || (canEdit && onEdit)) && (
            <div className="grid grid-cols-2 gap-2">
              {onCopy && (
                <Button variant="outline" onClick={() => onCopy(recipe)}>
                  <Copy className="mr-2 h-4 w-4" /> Clonar
                </Button>
              )}
              {canEdit && onEdit && (
                <Button variant="outline" onClick={() => onEdit(recipe, isNutriPlannerRecipe)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </Button>
              )}
            </div>
          )}
          {onDelete && canEdit && (
            <div className="flex justify-center pt-1">
              <DeleteConfirmButton onConfirm={() => onDelete(recipe.id, isNutriPlannerRecipe)} />
            </div>
          )}
        </DialogFooter>
      ) : (
        <DialogFooter className="mt-6 flex flex-row justify-between items-center w-full">
          <div className="flex flex-wrap gap-2">
            {onDelete && canEdit && (
              <DeleteConfirmButton onConfirm={() => onDelete(recipe.id, isNutriPlannerRecipe)} />
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
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
      )}

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
