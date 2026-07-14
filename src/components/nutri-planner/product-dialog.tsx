'use client';

import { useEffect, useState } from 'react';
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
import { PackageSearch, ScanBarcode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MEAL_CATEGORIES } from '@/lib/constants';
import type { MealCategory, Recipe } from '@/lib/types';
import type { OffProduct } from '@/lib/open-food-facts';
import { OffSearchDialog } from './off-search-dialog';

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives a ready-to-save Recipe payload (a 1-serving "product"). */
  onSave: (recipeData: Omit<Recipe, 'id'>) => void;
  isSaving?: boolean;
}

/**
 * Quick add of a supermarket product to the recipe library: scan its barcode
 * or search Open Food Facts (prefills macros), or type everything by hand.
 * Saves as a normal 1-serving Recipe so it can be planned, eaten and counted
 * like any other meal.
 */
export function ProductDialog({ isOpen, onClose, onSave, isSaving = false }: ProductDialogProps) {
  const { toast } = useToast();
  const [isOffSearchOpen, setIsOffSearchOpen] = useState(false);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [grams, setGrams] = useState('100');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [category, setCategory] = useState<MealCategory[]>(['snack']);
  const [imageUrl, setImageUrl] = useState('');
  // per-100g data from OFF: while present (and macros untouched), changing the
  // ración size recomputes the macros automatically.
  const [per100, setPer100] = useState<OffProduct['per100g'] | null>(null);
  const [macrosDirty, setMacrosDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName(''); setBrand(''); setGrams('100'); setCalories(''); setProtein(''); setCarbs(''); setFat('');
      setCategory(['snack']); setImageUrl(''); setPer100(null); setMacrosDirty(false);
    }
  }, [isOpen]);

  const applyPer100 = (p: OffProduct['per100g'], gramsValue: number) => {
    const scale = gramsValue / 100;
    setCalories(String(Math.round(p.calories * scale)));
    setProtein(String(Math.round(p.protein * scale * 10) / 10));
    setCarbs(String(Math.round(p.carbs * scale * 10) / 10));
    setFat(String(Math.round(p.fat * scale * 10) / 10));
  };

  const handleOffSelect = (p: OffProduct) => {
    // Brand goes to its own field (shown apart from the name, like ingredients),
    // not baked into the title as "Nombre (Marca)".
    setName(p.name);
    setBrand(p.brand ?? '');
    setImageUrl(p.imageUrl ?? '');
    setPer100(p.per100g);
    setMacrosDirty(false);
    const g = Number(grams) > 0 ? Number(grams) : 100;
    applyPer100(p.per100g, g);
  };

  const handleGramsChange = (value: string) => {
    setGrams(value);
    const g = Number(value);
    if (per100 && !macrosDirty && Number.isFinite(g) && g > 0) applyPer100(per100, g);
  };

  const macroInput = (
    id: string, label: string, value: string, setter: (v: string) => void
  ) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => { setter(e.target.value); setMacrosDirty(true); }}
      />
    </div>
  );

  const gramsNum = Number(grams);
  const canSave =
    name.trim() !== '' &&
    Number.isFinite(Number(calories)) && calories !== '' &&
    Number.isFinite(gramsNum) && gramsNum > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (category.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Falta la categoría',
        description: 'Marca al menos una categoría (snack, desayuno…) para que la IA sepa dónde encaja.',
      });
      return;
    }
    onSave({
      name: name.trim(),
      ...(brand.trim() ? { brand: brand.trim() } : {}),
      description: `Producto · ración de ${gramsNum} g`,
      instructions: '',
      ingredients: [],
      servings: 1,
      category,
      dietTags: [],
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      ...(imageUrl ? { imageUrl } : {}),
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md bg-glass max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              Añadir producto
            </DialogTitle>
            <DialogDescription>
              Un producto del súper (yogur, barrita, bebida…) que podrás planificar y marcar como
              comido igual que una receta.
            </DialogDescription>
          </DialogHeader>

          <Button variant="outline" onClick={() => setIsOffSearchOpen(true)}>
            <ScanBarcode className="mr-2 h-4 w-4" />
            Escanear código / buscar en Open Food Facts
          </Button>

          <div className="space-y-3">
            <div>
              <Label htmlFor="product-name">Nombre</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Yogur griego natural"
              />
            </div>
            <div>
              <Label htmlFor="product-brand">Marca</Label>
              <Input
                id="product-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Opcional · ej. Hacendado"
              />
            </div>
            <div>
              <Label htmlFor="product-grams">Tamaño de la ración (g o ml)</Label>
              <Input
                id="product-grams"
                type="number"
                inputMode="numeric"
                value={grams}
                onChange={(e) => handleGramsChange(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Lo que te comes de una vez (un yogur = 125 g, una lata = 330 ml…).
                {per100 ? ' Los macros se recalculan solos al cambiarla.' : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {macroInput('product-kcal', 'Calorías (kcal)', calories, setCalories)}
              {macroInput('product-prot', 'Proteína (g)', protein, setProtein)}
              {macroInput('product-carbs', 'Carbs (g)', carbs, setCarbs)}
              {macroInput('product-fat', 'Grasa (g)', fat, setFat)}
            </div>
            <div>
              <Label>Categoría</Label>
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
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OffSearchDialog
        isOpen={isOffSearchOpen}
        onClose={() => setIsOffSearchOpen(false)}
        onSelect={handleOffSelect}
        description="El nombre y los macros se rellenarán con los datos del producto."
      />
    </>
  );
}
