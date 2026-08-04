'use client';

import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fixOrphanIngredient, listOrphanIngredients } from '@/lib/actions';
import type { OrphanRef } from '@/lib/orphan-ingredients';
import type { BaseIngredient } from '@/lib/types';
import { ingredientKey, normalizeText } from '@/lib/utils';

/**
 * Recetas cuyas líneas apuntan a un alimento que ya no existe con ese nombre.
 *
 * Vive con las RECETAS y no con los ingredientes porque lo que se arregla son
 * recetas. Se trae su propio catálogo para el desplegable, así que un alimento
 * recién creado aparece aquí sin recargar nada.
 *
 * El trabajo real lo hacen dos Server Actions: el panel corre como cliente y
 * las rules le dejan leer las recetas de todos, pero no escribirlas.
 */
export function OrphanIngredientsCard() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const ingredientsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'ingredients') : null),
        [firestore]
    );
    const { data: ingredients } = useCollection<BaseIngredient>(ingredientsRef);

    const catalog = useMemo(
        () => [...(ingredients ?? [])].sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name))),
        [ingredients]
    );

    const [orphans, setOrphans] = useState<OrphanRef[] | null>(null);
    const [scanning, setScanning] = useState(false);
    const [target, setTarget] = useState<Record<string, string>>({});
    const [fixing, setFixing] = useState<string | null>(null);

    const scan = async () => {
        const token = await user?.getIdToken();
        if (!token) return;
        setScanning(true);
        const res = await listOrphanIngredients(token);
        setScanning(false);
        if (res.success) setOrphans(res.orphans);
        else toast({ variant: 'destructive', title: 'Error', description: res.error });
    };

    const fix = async (o: OrphanRef) => {
        const key = ingredientKey(o.name, o.brand);
        const toId = target[key];
        const token = await user?.getIdToken();
        if (!toId || !token || fixing) return;
        setFixing(key);
        const res = await fixOrphanIngredient(token, { name: o.name, brand: o.brand }, toId);
        setFixing(null);
        if (res.success) {
            toast({ title: 'Arreglado', description: res.message });
            scan();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: res.error });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <CardTitle>Recetas que apuntan a un alimento inexistente</CardTitle>
                        <CardDescription>
                            Al renombrar o borrar un alimento, las recetas que lo usaban se quedan apuntando al nombre
                            viejo y esa línea pasa a sumar 0. Esto revisa el recetario global{' '}
                            <strong>y las recetas privadas de cada usuario</strong>, y al reapuntarlas recalcula sus
                            macros. Puedes apuntarlas a un alimento que acabes de crear.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={scan} disabled={scanning}>
                        {scanning ? 'Revisando…' : 'Revisar recetas'}
                    </Button>
                </div>
            </CardHeader>
            {orphans !== null && (
                <CardContent className="space-y-2">
                    {orphans.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Ninguna referencia rota. Todas las recetas resuelven sus ingredientes.
                        </p>
                    ) : (
                        orphans.map((o) => {
                            const key = ingredientKey(o.name, o.brand);
                            return (
                                <div key={key} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">
                                            {o.name}
                                            {o.brand && <span className="text-muted-foreground"> · {o.brand}</span>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {o.uses} línea(s){o.inUserRecipes && ', incluye recetas de usuarios'} ·{' '}
                                            {o.sampleRecipes.join(', ')}
                                        </p>
                                    </div>
                                    <select
                                        className="h-9 rounded-md border bg-background px-2 text-sm"
                                        value={target[key] ?? ''}
                                        onChange={(e) => setTarget((p) => ({ ...p, [key]: e.target.value }))}
                                        aria-label={`Apuntar ${o.name} a otro alimento`}
                                    >
                                        <option value="">Apuntar a…</option>
                                        {catalog.map((i) => (
                                            <option key={i.id} value={i.id}>
                                                {i.name}
                                                {i.brand ? ` · ${i.brand}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <Button size="sm" disabled={!target[key] || fixing === key} onClick={() => fix(o)}>
                                        {fixing === key ? 'Arreglando…' : 'Arreglar'}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            )}
        </Card>
    );
}
