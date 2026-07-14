'use client';
import { useMemo, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDoc, addDoc, updateDoc, deleteField } from 'firebase/firestore';
import type { BaseIngredient } from '@/lib/types';
import { normalizeText } from '@/lib/utils';
import { singularKey } from '@/lib/ingredient-similarity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, ArrowLeft, PlusCircle, Merge, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NewIngredientDialog, EditableIngredient } from '@/components/nutri-planner/new-ingredient-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminIngredientsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const globalIngredientsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'ingredients') : null),
        [firestore]
    );
    const { data: ingredients, isLoading } = useCollection<BaseIngredient>(globalIngredientsRef);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [ingredientToEdit, setIngredientToEdit] = useState<EditableIngredient | null>(null);
    // Per duplicate group: which ingredient survives the merge (default: first).
    const [mergeKeep, setMergeKeep] = useState<Record<string, string>>({});
    const [isMerging, setIsMerging] = useState(false);

    // Alphabetical order (accent-insensitive) so near-duplicates sit together.
    const sortedIngredients = useMemo(
        () => [...(ingredients ?? [])].sort((a, b) =>
            normalizeText(a.name).localeCompare(normalizeText(b.name)) ||
            normalizeText(a.brand ?? '').localeCompare(normalizeText(b.brand ?? ''))
        ),
        [ingredients]
    );

    // Suspected duplicates: same plural-folded name AND same brand. "clara de
    // huevo" / "claras de huevo" group together; same-name different-brand
    // products are legitimately distinct and do NOT.
    const duplicateGroups = useMemo(() => {
        const byKey = new Map<string, BaseIngredient[]>();
        sortedIngredients.forEach(ing => {
            const key = `${singularKey(ing.name)}||${normalizeText(ing.brand ?? '')}`;
            byKey.set(key, [...(byKey.get(key) ?? []), ing]);
        });
        return [...byKey.entries()].filter(([, group]) => group.length > 1);
    }, [sortedIngredients]);

    const handleEdit = (ingredient: BaseIngredient) => {
        setIngredientToEdit(ingredient);
        setIsDialogOpen(true);
    };

    const handleDelete = async (ingredientId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'ingredients', ingredientId));
            toast({ title: "Ingrediente eliminado", description: "El ingrediente ha sido eliminado de la base de datos global." });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
        }
    };

    /** Deletes every ingredient in the group except the chosen survivor. */
    const handleMerge = async (groupKey: string, group: BaseIngredient[]) => {
        if (!firestore) return;
        const keepId = mergeKeep[groupKey] ?? group[0].id;
        const losers = group.filter(i => i.id !== keepId);
        setIsMerging(true);
        try {
            for (const loser of losers) {
                await deleteDoc(doc(firestore, 'ingredients', loser.id));
            }
            const kept = group.find(i => i.id === keepId);
            toast({
                title: 'Duplicados fusionados',
                description: `Se conservó «${kept?.name}» y se eliminaron ${losers.length} duplicado(s).`,
            });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron eliminar todos los duplicados.' });
        } finally {
            setIsMerging(false);
        }
    };

    const handleSave = async (ingredientData: EditableIngredient) => {
        if (!globalIngredientsRef || !firestore) return;

        try {
            if (ingredientData.id) {
                // Editing: optional fields the user cleared must be REMOVED from the
                // doc — leaving them out of updateDoc would silently keep the old value.
                const docRef = doc(firestore, 'ingredients', ingredientData.id);
                const { id: _id, ...data } = ingredientData;
                await updateDoc(docRef, {
                    ...data,
                    brand: data.brand ?? deleteField(),
                    unitName: data.unitName ?? deleteField(),
                    unitWeight: data.unitWeight ?? deleteField(),
                });
                toast({ title: 'Ingrediente actualizado' });
            } else {
                await addDoc(globalIngredientsRef, ingredientData);
                toast({ title: 'Ingrediente creado' });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar." });
        }
        setIsDialogOpen(false);
        setIngredientToEdit(null);
    };

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <CardTitle>Ingredientes Globales</CardTitle>
                        <Button asChild variant="outline">
                            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel</Link>
                        </Button>
                    </div>

                    {/* Suspected duplicates: same folded name + same brand */}
                    {duplicateGroups.length > 0 && (
                        <Card className="border-amber-500/40">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <CardTitle>Posibles duplicados ({duplicateGroups.length})</CardTitle>
                                </div>
                                <CardDescription>
                                    Alimentos con el mismo nombre (ignorando plurales y tildes) y la misma marca.
                                    Elige cuál conservar y fusiona: los demás se eliminan de la base compartida.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {duplicateGroups.map(([groupKey, group]) => {
                                    const keepId = mergeKeep[groupKey] ?? group[0].id;
                                    return (
                                        <div key={groupKey} className="rounded-lg border p-3 space-y-2">
                                            {group.map(ing => (
                                                <label key={ing.id} className="flex items-center gap-3 cursor-pointer text-sm">
                                                    <input
                                                        type="radio"
                                                        name={`merge-${groupKey}`}
                                                        checked={keepId === ing.id}
                                                        onChange={() => setMergeKeep(prev => ({ ...prev, [groupKey]: ing.id }))}
                                                        className="accent-primary"
                                                    />
                                                    <span className="font-medium">{ing.name}</span>
                                                    {ing.brand && <span className="text-xs text-muted-foreground">{ing.brand}</span>}
                                                    <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                                                        {ing.calories} kcal · P {ing.protein} · C {ing.carbs} · G {ing.fat}
                                                    </span>
                                                </label>
                                            ))}
                                            <div className="flex justify-end pt-1">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="outline" disabled={isMerging}>
                                                            <Merge className="mr-2 h-4 w-4" />
                                                            Fusionar (conservar seleccionado)
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-glass">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Fusionar este grupo?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Se conservará «{group.find(i => i.id === keepId)?.name}» y se eliminarán{' '}
                                                                {group.length - 1} duplicado(s) de la base global. Las recetas que usaban
                                                                el nombre eliminado mantienen sus totales guardados, pero su editor dejará
                                                                de resolver ese ingrediente. Esta acción no se puede deshacer.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleMerge(groupKey, group)}>
                                                                Sí, fusionar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Base de Datos de Ingredientes</CardTitle>
                                    <CardDescription>
                                        Ver y gestionar todos los ingredientes en la base de datos compartida.
                                    </CardDescription>
                                </div>
                                <Button onClick={() => { setIngredientToEdit(null); setIsDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nuevo Ingrediente
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading && <p>Cargando ingredientes...</p>}
                            {!isLoading && ingredients && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Marca</TableHead>
                                            <TableHead>Unidad</TableHead>
                                            <TableHead className="text-center">Calorías</TableHead>
                                            <TableHead className="text-center">Proteínas</TableHead>
                                            <TableHead className="text-center">Carbs</TableHead>
                                            <TableHead className="text-center">Grasas</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedIngredients.map(ing => (
                                            <TableRow key={ing.id}>
                                                <TableCell className="font-medium">{ing.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{ing.brand ?? '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {ing.unitName && ing.unitWeight ? `1 ${ing.unitName} = ${ing.unitWeight} g` : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">{ing.calories}</TableCell>
                                                <TableCell className="text-center">{ing.protein}g</TableCell>
                                                <TableCell className="text-center">{ing.carbs}g</TableCell>
                                                <TableCell className="text-center">{ing.fat}g</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ing)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-glass">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Eliminar «{ing.name}»?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Este ingrediente se eliminará de la base de datos global compartida por todos los usuarios. Esta acción no se puede deshacer.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(ing.id)}>
                                                                    Sí, eliminar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <NewIngredientDialog
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setIngredientToEdit(null); }}
                onSave={handleSave}
                ingredientToEdit={ingredientToEdit}
            />
        </>
    );
}
