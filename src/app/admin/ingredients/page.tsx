'use client';

import { useState, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Search, Edit, Trash2 } from 'lucide-react';
import { NewIngredientDialog } from '@/components/nutri-planner/new-ingredient-dialog';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { BaseIngredient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";

export default function AdminIngredientsPage() {
    const { user, claims } = useUser();
    const isAdmin = claims?.admin === true;
    const { toast } = useToast();
    const firestore = useFirestore();

    const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
    const { data: ingredients, isLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [ingredientToEdit, setIngredientToEdit] = useState<BaseIngredient | null>(null);
    const [ingredientToDelete, setIngredientToDelete] = useState<BaseIngredient | null>(null);

    const filteredIngredients = useMemo(() => {
        if (!ingredients) return [];
        if (!searchQuery) return ingredients;
        
        return ingredients.filter(ingredient => 
            ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [ingredients, searchQuery]);

    const handleEditClick = (ingredient: BaseIngredient) => {
        const canEdit = user && (ingredient.createdBy === user.uid || isAdmin);
        if (canEdit) {
            setIngredientToEdit(ingredient);
            setIsEditOpen(true);
            if (isAdmin && ingredient.createdBy !== user?.uid) {
                toast({ title: 'Permiso de administrador', description: 'Editando un ingrediente de otro usuario.' });
            }
        } else {
            toast({
                variant: 'destructive',
                title: 'Acción no permitida',
                description: 'Solo el propietario o un administrador puede editar este ingrediente.',
            });
        }
    };
    
    const handleDeleteTrigger = (ingredient: BaseIngredient) => {
        const canDelete = user && (ingredient.createdBy === user.uid || isAdmin);
        if (canDelete) {
            setIngredientToDelete(ingredient);
        } else {
             toast({
                variant: 'destructive',
                title: 'Acción no permitida',
                description: 'Solo el propietario o un administrador puede borrar este ingrediente.',
            });
        }
    }

    const handleSaveIngredient = (ingredientData: Partial<BaseIngredient>) => {
        if (!firestore || !user) return;
        
        if (ingredientData.id) { // Editing existing ingredient
            const { id, ...data } = ingredientData;
            const ingredientRef = doc(firestore, 'ingredients', id);
            const finalData = {
                ...data,
                createdBy: ingredientToEdit?.createdBy || user.uid,
            };
            setDocumentNonBlocking(ingredientRef, finalData, { merge: true });
            toast({ title: "Ingrediente actualizado" });
        } else { // Creating new ingredient
            addDocumentNonBlocking(ingredientsCollectionRef!, { ...ingredientData, createdBy: user.uid });
            toast({ title: "Ingrediente creado" });
        }

        setIsNewOpen(false);
        setIsEditOpen(false);
        setIngredientToEdit(null);
    };

    const handleDeleteConfirm = () => {
        if (!firestore || !ingredientToDelete) return;
        const ingredientRef = doc(firestore, 'ingredients', ingredientToDelete.id);
        deleteDocumentNonBlocking(ingredientRef);
        toast({ title: "Ingrediente eliminado", description: `"${ingredientToDelete.name}" ha sido eliminado.` });
        setIngredientToDelete(null);
    }

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Base de Datos de Ingredientes</CardTitle>
                                    <CardDescription>
                                        Gestiona la colección global de <code className="bg-muted px-1 py-0.5 rounded">/ingredients</code>.
                                    </CardDescription>
                                </div>
                                <Button onClick={() => setIsNewOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nuevo Ingrediente
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <ScrollArea className="h-[60vh] border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="text-right">Calorías</TableHead>
                                            <TableHead className="text-right">Proteína (g)</TableHead>
                                            <TableHead className="text-right">Carbs (g)</TableHead>
                                            <TableHead className="text-right">Grasa (g)</TableHead>
                                            <TableHead className="text-right">Fibra (g)</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow>}
                                        {filteredIngredients.map(ingredient => {
                                            const canManage = user && (ingredient.createdBy === user.uid || isAdmin);
                                            return (
                                                <TableRow key={ingredient.id}>
                                                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                                                    <TableCell className="text-right">{ingredient.calories}</TableCell>
                                                    <TableCell className="text-right">{ingredient.protein}</TableCell>
                                                    <TableCell className="text-right">{ingredient.carbs}</TableCell>
                                                    <TableCell className="text-right">{ingredient.fat}</TableCell>
                                                    <TableCell className="text-right">{ingredient.fiber || 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(ingredient)} disabled={!canManage}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTrigger(ingredient)} disabled={!canManage}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                 {!isLoading && filteredIngredients.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No se encontraron ingredientes.
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Dialog for Creating */}
            <NewIngredientDialog
                isOpen={isNewOpen}
                onClose={() => setIsNewOpen(false)}
                onSave={handleSaveIngredient}
            />

            {/* Dialog for Editing */}
            <NewIngredientDialog
                isOpen={isEditOpen}
                onClose={() => { setIsEditOpen(false); setIngredientToEdit(null); }}
                onSave={handleSaveIngredient}
                ingredientToEdit={ingredientToEdit}
            />

            {/* Alert Dialog for Deleting */}
            {ingredientToDelete && (
                <AlertDialog open={!!ingredientToDelete} onOpenChange={() => setIngredientToDelete(null)}>
                     <AlertDialogContent className="bg-glass">
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente el ingrediente "{ingredientToDelete.name}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIngredientToDelete(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm}>Sí, eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
