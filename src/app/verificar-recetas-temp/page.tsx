'use client';

import { useMemo, useState } from 'react';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Recipe, BaseIngredient, Ingredient } from '@/lib/types';
import { ingredientKey, normalizeText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Same lookup/scaling logic as recipe-dialog.tsx's live preview, so the
// recomputed totals here match exactly what the editor would show.
function buildIngredientDBMap(ingredientDB: BaseIngredient[] | null | undefined) {
  const map = new Map<string, BaseIngredient>();
  (ingredientDB ?? []).forEach(ing => {
    map.set(ingredientKey(ing.name, ing.brand), ing);
    const nameOnly = normalizeText(ing.name);
    if (!map.has(nameOnly)) map.set(nameOnly, ing);
  });
  return map;
}

function lookupBaseIngredient(map: Map<string, BaseIngredient>, name: string, brand?: string) {
  return map.get(ingredientKey(name, brand)) ?? map.get(normalizeText(name));
}

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

interface Macros { calories: number; protein: number; carbs: number; fat: number }

interface Row {
  id: string;
  name: string;
  stored: Macros;
  recomputed: Macros;
  missingIngredients: string[];
  diffPct: number;
}

/**
 * Read-only diagnostic (with an opt-in fix per row): compares each global
 * recipe's STORED batch totals against what recomputing from its ingredient
 * list + the CURRENT ingredient catalog would produce. Recipes store a
 * snapshot of totals at save time (see serving-utils.ts) — after the 2026-07-15
 * ingredient-name unification, any recipe whose totals weren't recalculated
 * and re-saved afterwards could be showing stale macros. Temp page — delete
 * once the review is done.
 */
export default function VerificarRecetasTempPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());

  const recipesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'nutriplanner_recipes') : null), [firestore]);
  const ingredientsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'ingredients') : null), [firestore]);
  const { data: recipes, isLoading: recipesLoading } = useCollection<Recipe>(recipesRef);
  const { data: ingredientDB, isLoading: ingLoading } = useCollection<BaseIngredient>(ingredientsRef);

  const dbMap = useMemo(() => buildIngredientDBMap(ingredientDB), [ingredientDB]);

  const rows: Row[] = useMemo(() => {
    if (!recipes) return [];
    return recipes.map(r => {
      const missing: string[] = [];
      const recomputed = r.ingredients.reduce<Macros>((acc, ing) => {
        const baseIng = lookupBaseIngredient(dbMap, ing.name, ing.brand);
        if (!baseIng) {
          missing.push(ing.brand ? `${ing.name} (${ing.brand})` : ing.name);
          return acc;
        }
        const scale = ingredientGrams(ing, baseIng) / 100;
        acc.calories += (baseIng.calories || 0) * scale;
        acc.protein += (baseIng.protein || 0) * scale;
        acc.carbs += (baseIng.carbs || 0) * scale;
        acc.fat += (baseIng.fat || 0) * scale;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      const stored: Macros = {
        calories: r.calories || 0,
        protein: r.protein || 0,
        carbs: r.carbs || 0,
        fat: r.fat || 0,
      };
      const diffPct = stored.calories > 0
        ? Math.abs(recomputed.calories - stored.calories) / stored.calories * 100
        : (recomputed.calories > 0 ? 100 : 0);

      return { id: r.id, name: r.name, stored, recomputed, missingIngredients: missing, diffPct };
    });
  }, [recipes, dbMap]);

  const flagged = rows
    .filter(r => (r.diffPct > 3 || r.missingIngredients.length > 0) && !fixedIds.has(r.id))
    .sort((a, b) => b.diffPct - a.diffPct);

  const handleFix = async (row: Row) => {
    if (!firestore) return;
    setFixingId(row.id);
    try {
      await updateDoc(doc(firestore, 'nutriplanner_recipes', row.id), {
        calories: Math.round(row.recomputed.calories),
        protein: Math.round(row.recomputed.protein),
        carbs: Math.round(row.recomputed.carbs),
        fat: Math.round(row.recomputed.fat),
      });
      setFixedIds(prev => new Set(prev).add(row.id));
      toast({ title: 'Receta actualizada', description: row.name });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: e instanceof Error ? e.message : String(e) });
    } finally {
      setFixingId(null);
    }
  };

  if (userLoading || recipesLoading || ingLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!user) {
    return <div className="p-8 text-sm text-muted-foreground">Inicia sesión para ver esta página.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-xl font-bold">Verificación de totales — recetas globales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compara los macros totales guardados en cada receta global contra lo que saldría de recalcularlos ahora
          (ingredientes × catálogo actual). Solo se listan las que difieren más de un 3% en calorías o tienen algún
          ingrediente sin match en el catálogo. {rows.length} recetas revisadas.
        </p>
      </div>

      {flagged.length === 0 ? (
        <p className="font-medium text-green-600">
          {fixedIds.size > 0
            ? `Listo — ${fixedIds.size} receta(s) corregida(s), el resto ya cuadraba.`
            : 'Todo cuadra: ninguna receta global necesita corrección.'}
        </p>
      ) : (
        <div className="space-y-3">
          {flagged.map(row => (
            <div key={row.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{row.name}</span>
                <Button
                  size="sm"
                  disabled={fixingId === row.id || row.missingIngredients.length > 0}
                  onClick={() => handleFix(row)}
                >
                  {fixingId === row.id ? 'Guardando…' : 'Recalcular y guardar'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Guardado</p>
                  <p>{Math.round(row.stored.calories)} kcal · {Math.round(row.stored.protein)}p · {Math.round(row.stored.carbs)}c · {Math.round(row.stored.fat)}g</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recalculado ({row.diffPct.toFixed(0)}% de diferencia)</p>
                  <p>{Math.round(row.recomputed.calories)} kcal · {Math.round(row.recomputed.protein)}p · {Math.round(row.recomputed.carbs)}c · {Math.round(row.recomputed.fat)}g</p>
                </div>
              </div>
              {row.missingIngredients.length > 0 && (
                <p className="text-xs text-destructive">
                  Sin match en el catálogo (arregla esto antes de poder recalcular): {row.missingIngredients.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
