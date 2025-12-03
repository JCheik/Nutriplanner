'use client';
import { useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { BaseIngredient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NewIngredientDialog } from '@/components/nutri-planner/new-ingredient-dialog';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
    const [ingredientToEdit, setIngredientToEdit] = useState<Partial<BaseIngredient> | null>(null);
    
    const handleEdit = (ingredient: BaseIngredient) => {
        setIngredientToEdit(ingredient);
        setIsDialogOpen(true);
    };

    const handleDelete = (ingredientId: string) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'ingredients', ingredientId));
        toast({ title: "Ingrediente eliminado", description: "El ingrediente ha sido eliminado de la base de datos global." });
    };

    const handleSave = (ingredientData: Partial<Omit<BaseIngredient, 'id' | 'createdBy'>> & { id?: string }) => {
        if (!globalIngredientsRef) return;
        
        if (ingredientData.id) {
            // Editing existing ingredient
            const docRef = doc(globalIngredientsRef, ingredientData.id);
            updateDocumentNonBlocking(docRef, ingredientData);
            toast({ title: 'Ingrediente actualizado' });
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Base de Datos de Ingredientes</CardTitle>
                            <CardDescription>
                                Ver y gestionar todos los ingredientes en la base de datos compartida.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading && <p>Cargando ingredientes...</p>}
                            {!isLoading && ingredients && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="text-center">Calorías</TableHead>
                                            <TableHead className="text-center">Proteínas</TableHead>
                                            <TableHead className="text-center">Carbs</TableHead>
                                            <TableHead className="text-center">Grasas</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ingredients.map(ing => (
                                            <TableRow key={ing.id}>
                                                <TableCell className="font-medium">{ing.name}</TableCell>
                                                <TableCell className="text-center">{ing.calories}</TableCell>
                                                <TableCell className="text-center">{ing.protein}g</TableCell>
                                                <TableCell className="text-center">{ing.carbs}g</TableCell>
                                                <TableCell className="text-center">{ing.fat}g</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ing)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ing.id)}>
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
        </>
    );
}
