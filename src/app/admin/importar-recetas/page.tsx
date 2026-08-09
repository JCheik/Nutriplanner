'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Upload } from 'lucide-react';
import { addDoc, collection, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { copyRecipeToUser } from '@/firebase/firestore-operations';
import { expandSeedRecipe, FOODS, SEED_RECIPES } from '@/lib/seed-recipes';
import { normalizeText } from '@/lib/utils';
import type { BaseIngredient } from '@/lib/types';

/**
 * Carga en bloque de la tanda de recetas de `seed-recipes.ts`.
 *
 * Existe porque no hay forma de meter recetas a granel: el editor las hace de
 * una en una, y el objetivo son 100 para el alfa. Escribe con la sesión del
 * propio usuario (nada de claves de servicio), así que pasa por las mismas
 * reglas de Firestore que el resto de la app.
 *
 * Las recetas van a las TUYAS, no al recetario de Nutrilp: la idea es revisarlas
 * y publicar luego solo las que convenzan.
 */
export default function ImportarRecetasPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ recipes: number; foods: number } | null>(null);

  const preview = useMemo(() => SEED_RECIPES.map(expandSeedRecipe), []);
  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byDiet: Record<string, number> = {};
    SEED_RECIPES.forEach((r) => {
      byCategory[r.category[0]] = (byCategory[r.category[0]] ?? 0) + 1;
      r.dietTags.forEach((d) => (byDiet[d] = (byDiet[d] ?? 0) + 1));
    });
    return { byCategory, byDiet };
  }, []);

  const handleImport = async () => {
    if (!user || !firestore || busy) return;
    setBusy(true);
    try {
      // 1. Alimentos que falten en el catálogo compartido. Se comparan por
      //    nombre normalizado para no crear "Tomate" cuando ya existe "tomate".
      const snap = await getDocs(collection(firestore, 'ingredients'));
      const existing = new Set(snap.docs.map((d) => normalizeText((d.data() as BaseIngredient).name ?? '')));
      const missing = Object.entries(FOODS).filter(([name]) => !existing.has(normalizeText(name)));

      for (const [name, food] of missing) {
        const payload: Omit<BaseIngredient, 'id'> = {
          name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          ...(food.unitName ? { unitName: food.unitName } : {}),
          ...(food.unitWeight ? { unitWeight: food.unitWeight } : {}),
          // Las rules exigen que coincida con el uid que escribe.
          createdBy: user.uid,
        };
        await addDoc(collection(firestore, 'ingredients'), payload);
      }

      // 2. Las recetas, a las del usuario.
      for (const seed of SEED_RECIPES) {
        await copyRecipeToUser(firestore, user.uid, expandSeedRecipe(seed));
      }

      setDone({ recipes: SEED_RECIPES.length, foods: missing.length });
      toast({
        title: 'Recetas importadas',
        description: `${SEED_RECIPES.length} recetas en tu recetario y ${missing.length} alimentos nuevos en el catálogo.`,
      });
    } catch (e) {
      console.error('[importar-recetas]', e);
      toast({
        variant: 'destructive',
        title: 'No se pudo importar',
        description: e instanceof Error ? e.message : 'Revisa la consola.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin" aria-label="Volver al panel">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Importar tanda de recetas</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{SEED_RECIPES.length} recetas listas</CardTitle>
            <CardDescription>
              {Object.entries(counts.byCategory).map(([k, v]) => `${v} ${k}s`).join(' · ')}
              {' — '}
              {Object.entries(counts.byDiet).map(([k, v]) => `${v} ${k}`).join(' · ')}.
              Se guardan en <strong>tus recetas</strong>, no en el recetario de Nutrilp: revísalas y publica
              luego las que te gusten. Los alimentos que no estén en el catálogo se crean solos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleImport} disabled={busy || !user || !!done}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : done ? <Check className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              {busy ? 'Importando…' : done ? 'Importadas' : 'Importar a mis recetas'}
            </Button>
            {done && (
              <p className="text-sm text-muted-foreground">
                {done.recipes} recetas añadidas y {done.foods} alimentos creados. Recarga Recetas para verlas.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Si le das dos veces se duplican: no hay comprobación de repetidas, y con una tanda que se
              importa una vez no compensa el enredo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qué se va a importar</CardTitle>
            <CardDescription>Macros por ración, calculados de los ingredientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Receta</th>
                    <th className="py-2 pr-3">Para</th>
                    <th className="py-2 pr-3 text-right">kcal</th>
                    <th className="py-2 pr-3 text-right">P</th>
                    <th className="py-2 pr-3 text-right">C</th>
                    <th className="py-2 pr-3 text-right">G</th>
                    <th className="py-2">Dieta</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => {
                    const s = r.servings || 1;
                    return (
                      <tr key={r.name} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{r.name}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{SEED_RECIPES[i].category[0]}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{Math.round(r.calories / s)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{Math.round(r.protein / s)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{Math.round(r.carbs / s)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{Math.round(r.fat / s)}</td>
                        <td className="py-1.5 text-xs text-muted-foreground">{SEED_RECIPES[i].dietTags.join(', ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
