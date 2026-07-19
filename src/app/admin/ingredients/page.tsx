'use client';
import { useMemo, useState } from 'react';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDoc, addDoc, updateDoc, deleteField } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { BaseIngredient, Ingredient, Recipe } from '@/lib/types';
import { normalizeText, ingredientKey } from '@/lib/utils';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type RecipeUsage = { recipeName: string; scope: 'global'; ingredientName: string };

/**
 * Which GLOBAL recipes (nutriplanner_recipes) reference any of `targets` by
 * identity (name+brand). Recipe ingredients are free-text, not a doc
 * reference, so this is the only way to know before a delete/merge silently
 * breaks that line's macro resolution in a recipe.
 *
 * Scoped to the global catalog only: a per-user collectionGroup('recipes')
 * query would need a `match /{path=**}/recipes/{id}` rule in firestore.rules
 * (the existing `match /users/{userId}/recipes/{recipeId}` rule only covers
 * queries scoped to one known user, not a cross-user collection-group query —
 * confirmed live, it throws permission-denied even for an admin). Adding that
 * rule means deploying rules to production, so it's deliberately left out
 * until that's explicitly requested.
 */
async function findRecipesUsingIngredients(firestore: Firestore, targets: BaseIngredient[]): Promise<RecipeUsage[]> {
    const targetKeys = new Set(targets.map(t => ingredientKey(t.name, t.brand)));
    const globalSnap = await getDocs(collection(firestore, 'nutriplanner_recipes'));

    const results: RecipeUsage[] = [];
    globalSnap.forEach(docSnap => {
        const recipe = docSnap.data() as Recipe;
        const match = (recipe.ingredients ?? []).find(ing => targetKeys.has(ingredientKey(ing.name, ing.brand)));
        if (match) {
            results.push({ recipeName: recipe.name, scope: 'global', ingredientName: match.name });
        }
    });
    return results;
}

// User-called-out groups that the automatic singularKey grouping doesn't
// catch because they're different words/phrases, not just plural/accent
// variants (e.g. "Huevo" vs "Huevo entero" — different singularKey, but the
// admin wants them treated as one food).
const MANUAL_GROUPS: { key: string; names: string[] }[] = [
    { key: 'manual-huevo', names: ['Huevo', 'Huevos', 'Huevo entero', 'Huevos enteros'] },
];

/** Ingredient row rewritten to point at `kept`'s identity, dropping brand if `kept` has none. */
function retargetIngredient(ing: Ingredient, kept: BaseIngredient): Ingredient {
    const { brand: _oldBrand, ...rest } = ing;
    return kept.brand ? { ...rest, name: kept.name, brand: kept.brand } : { ...rest, name: kept.name };
}

/**
 * Rewrites every ingredient line in global recipes that pointed at one of the
 * `losers` (identity = ingredientKey) so it points at `kept` instead, and
 * deletes the loser BaseIngredient docs — all in one batch, so a rename never
 * lands without the delete (or vice versa). Scoped to global recipes for the
 * same rules reason as findRecipesUsingIngredients.
 */
async function mergeIngredientsAndRetargetRecipes(
    firestore: Firestore,
    losers: BaseIngredient[],
    kept: BaseIngredient
): Promise<number> {
    const loserKeys = new Set(losers.map(l => ingredientKey(l.name, l.brand)));
    const globalSnap = await getDocs(collection(firestore, 'nutriplanner_recipes'));

    const batch = writeBatch(firestore);
    let recipesUpdated = 0;

    globalSnap.forEach(docSnap => {
        const recipe = docSnap.data() as Recipe;
        const ingredientsList = recipe.ingredients ?? [];
        const touched = ingredientsList.some(ing => loserKeys.has(ingredientKey(ing.name, ing.brand)));
        if (!touched) return;
        const nextIngredients = ingredientsList.map(ing =>
            loserKeys.has(ingredientKey(ing.name, ing.brand)) ? retargetIngredient(ing, kept) : ing
        );
        batch.update(docSnap.ref, { ingredients: nextIngredients });
        recipesUpdated += 1;
    });

    losers.forEach(loser => batch.delete(doc(firestore, 'ingredients', loser.id)));
    await batch.commit();
    return recipesUpdated;
}

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

    // Delete confirmation: null = closed. `usedIn` fills in after the async
    // recipe-usage check resolves; `checking` gates the confirm button so you
    // can't delete before the warning has had a chance to appear.
    const [deleteCheck, setDeleteCheck] = useState<{
        ingredient: BaseIngredient;
        checking: boolean;
        usedIn: RecipeUsage[];
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [mergeCheck, setMergeCheck] = useState<{
        groupKey: string;
        group: BaseIngredient[];
        checking: boolean;
        usedIn: RecipeUsage[];
    } | null>(null);

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

    // Each MANUAL_GROUPS entry surfaces as its own merge card, same UI/flow as
    // the automatic ones; any automatic group fully covered by a manual one is
    // hidden below to avoid showing the same pair twice.
    const manualGroups = useMemo(() => {
        return MANUAL_GROUPS
            .map(({ key, names }) => {
                const members = names
                    .map(n => sortedIngredients.find(i => normalizeText(i.name) === normalizeText(n)))
                    .filter((x): x is BaseIngredient => !!x);
                return [key, members] as [string, BaseIngredient[]];
            })
            .filter(([, members]) => members.length > 1);
    }, [sortedIngredients]);

    // Combined list actually rendered: automatic groups minus any fully
    // subsumed by a manual one, then the manual ones appended.
    const displayGroups = useMemo(() => {
        const manualIds = new Set(manualGroups.flatMap(([, members]) => members.map(m => m.id)));
        const filteredAuto = duplicateGroups.filter(([, group]) => !group.every(i => manualIds.has(i.id)));
        return [...filteredAuto, ...manualGroups];
    }, [duplicateGroups, manualGroups]);

    const handleEdit = (ingredient: BaseIngredient) => {
        setIngredientToEdit(ingredient);
        setIsDialogOpen(true);
    };

    /** Opens the delete-confirmation dialog and kicks off the recipe-usage check. */
    const handleDeleteClick = (ing: BaseIngredient) => {
        setDeleteCheck({ ingredient: ing, checking: true, usedIn: [] });
        if (!firestore) return;
        findRecipesUsingIngredients(firestore, [ing])
            .then(usedIn => {
                setDeleteCheck(prev => (prev && prev.ingredient.id === ing.id ? { ...prev, checking: false, usedIn } : prev));
            })
            .catch(e => {
                console.error('findRecipesUsingIngredients failed', e);
                setDeleteCheck(prev => (prev && prev.ingredient.id === ing.id ? { ...prev, checking: false, usedIn: [] } : prev));
            });
    };

    const confirmDelete = async () => {
        if (!firestore || !deleteCheck) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'ingredients', deleteCheck.ingredient.id));
            toast({ title: "Ingrediente eliminado", description: "El ingrediente ha sido eliminado de la base de datos global." });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
        } finally {
            setIsDeleting(false);
            setDeleteCheck(null);
        }
    };

    /** Opens the merge-confirmation dialog and checks usage of the ingredient(s)
     * that would actually disappear (the losers, not the one kept). */
    const handleMergeClick = (groupKey: string, group: BaseIngredient[]) => {
        setMergeCheck({ groupKey, group, checking: true, usedIn: [] });
        if (!firestore) return;
        const keepId = mergeKeep[groupKey] ?? group[0].id;
        const losers = group.filter(i => i.id !== keepId);
        findRecipesUsingIngredients(firestore, losers)
            .then(usedIn => {
                setMergeCheck(prev => (prev && prev.groupKey === groupKey ? { ...prev, checking: false, usedIn } : prev));
            })
            .catch(e => {
                console.error('findRecipesUsingIngredients failed', e);
                setMergeCheck(prev => (prev && prev.groupKey === groupKey ? { ...prev, checking: false, usedIn: [] } : prev));
            });
    };

    /** Deletes every ingredient in the group except the chosen survivor, and
     * retargets any global recipe that used a loser so it now points at the
     * survivor — the merge you approved should actually take effect where it's used. */
    const handleMerge = async () => {
        if (!firestore || !mergeCheck) return;
        const { groupKey, group } = mergeCheck;
        const keepId = mergeKeep[groupKey] ?? group[0].id;
        const losers = group.filter(i => i.id !== keepId);
        const kept = group.find(i => i.id === keepId);
        if (!kept) return;
        setIsMerging(true);
        try {
            const recipesUpdated = await mergeIngredientsAndRetargetRecipes(firestore, losers, kept);
            toast({
                title: 'Duplicados fusionados',
                description: `Se conservó «${kept.name}» y se eliminaron ${losers.length} duplicado(s).`
                    + (recipesUpdated > 0 ? ` Se actualizaron ${recipesUpdated} receta(s) global(es) para usar «${kept.name}».` : ''),
            });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la fusión.' });
        } finally {
            setIsMerging(false);
            setMergeCheck(null);
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

                    {/* Suspected duplicates: same folded name + same brand, plus manually called-out groups */}
                    {displayGroups.length > 0 && (
                        <Card className="border-amber-500/40">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <CardTitle>Posibles duplicados ({displayGroups.length})</CardTitle>
                                </div>
                                <CardDescription>
                                    Alimentos con el mismo nombre (ignorando plurales y tildes) y la misma marca,
                                    más algunos grupos añadidos a mano. Elige cuál conservar y fusiona: los demás
                                    se eliminan de la base compartida y las recetas que los usaban pasan a usar el conservado.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {displayGroups.map(([groupKey, group]) => {
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
                                                <Button size="sm" variant="outline" disabled={isMerging} onClick={() => handleMergeClick(groupKey, group)}>
                                                    <Merge className="mr-2 h-4 w-4" />
                                                    Fusionar (conservar seleccionado)
                                                </Button>
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
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ing)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
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

            <AlertDialog open={!!deleteCheck} onOpenChange={(open) => { if (!open) setDeleteCheck(null); }}>
                <AlertDialogContent className="bg-glass">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar «{deleteCheck?.ingredient.name}»?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>Este ingrediente se eliminará de la base de datos global compartida por todos los usuarios. Esta acción no se puede deshacer.</p>
                                {deleteCheck?.checking && <p className="text-sm">Comprobando si alguna receta global lo usa…</p>}
                                {!deleteCheck?.checking && deleteCheck && deleteCheck.usedIn.length > 0 && (
                                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                                        <p className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            Se usa en {deleteCheck.usedIn.length} receta(s) global(es):
                                        </p>
                                        <ul className="mt-1.5 list-disc list-inside">
                                            {deleteCheck.usedIn.map((u, i) => <li key={i}>{u.recipeName}</li>)}
                                        </ul>
                                        <p className="mt-1.5 text-muted-foreground">Esas recetas mantienen sus totales guardados, pero dejarán de resolver este ingrediente (macros a 0 en esa línea) si se reeditan.</p>
                                    </div>
                                )}
                                {!deleteCheck?.checking && deleteCheck && deleteCheck.usedIn.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Ninguna receta global lo usa. (Esta comprobación solo cubre las recetas del recetario base, no las privadas de cada usuario.)</p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting || deleteCheck?.checking}>
                            Sí, eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!mergeCheck} onOpenChange={(open) => { if (!open) setMergeCheck(null); }}>
                <AlertDialogContent className="bg-glass">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Fusionar este grupo?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Se conservará «{mergeCheck && mergeCheck.group.find(i => i.id === (mergeKeep[mergeCheck.groupKey] ?? mergeCheck.group[0].id))?.name}»
                                    {' '}y se eliminarán {mergeCheck ? mergeCheck.group.length - 1 : 0} duplicado(s) de la base global. Esta acción no se puede deshacer.
                                </p>
                                {mergeCheck?.checking && <p className="text-sm">Comprobando si alguna receta global usa los duplicados…</p>}
                                {!mergeCheck?.checking && mergeCheck && mergeCheck.usedIn.length > 0 && (
                                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                                        <p className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            Se actualizarán {mergeCheck.usedIn.length} receta(s) global(es) para usar «{mergeCheck.group.find(i => i.id === (mergeKeep[mergeCheck.groupKey] ?? mergeCheck.group[0].id))?.name}» en vez del duplicado:
                                        </p>
                                        <ul className="mt-1.5 list-disc list-inside">
                                            {mergeCheck.usedIn.map((u, i) => <li key={i}>«{u.ingredientName}» en {u.recipeName}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {!mergeCheck?.checking && mergeCheck && mergeCheck.usedIn.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Ninguna receta global usa los duplicados que se van a eliminar. (No comprueba las recetas privadas de cada usuario.)</p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMerge} disabled={isMerging || mergeCheck?.checking}>
                            Sí, fusionar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
