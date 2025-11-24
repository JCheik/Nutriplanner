'use client';

import { useState, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit, Trash2 } from 'lucide-react';
import { NewIngredientDialog } from '@/components/nutri-planner/new-ingredient-dialog';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { cn } from '@/lib/utils';

export function IngredientDatabaseManager() {
    const { user, claims } = useUser();
    const isAdmin = claims?.admin === true;
    const { toast } = useToast();
    const firestore = useFirestore();

    const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
    const { data: ingredients, isLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [ingredientToEdit, setIngredientToEdit] = useState<BaseIngredient | null>(null);

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
    
    const handleDeleteConfirm = (ingredientToDelete: BaseIngredient) => {
        if (!firestore) return;
        const canDelete = user && (ingredientToDelete.createdBy === user.uid || isAdmin);
        if (canDelete) {
            const ingredientRef = doc(firestore, 'ingredients', ingredientToDelete.id);
            deleteDocumentNonBlocking(ingredientRef);
            toast({ title: "Ingrediente eliminado", description: `"${ingredientToDelete.name}" ha sido eliminado.` });
        } else {
             toast({
                variant: 'destructive',
                title: 'Acción no permitida',
                description: 'Solo el propietario o un administrador puede borrar este ingrediente.',
            });
        }
    }

    const handleSaveIngredient = (ingredientData: Partial<BaseIngredient>) => {
        if (!firestore || !ingredientData.id || !user) return;
        
        const { id, ...data } = ingredientData;
        const ingredientRef = doc(firestore, 'ingredients', id);
        
        const finalData = {
            ...data,
            createdBy: ingredientToEdit?.createdBy || user.uid,
        };

        setDocumentNonBlocking(ingredientRef, finalData, { merge: true });
        toast({ title: "Ingrediente actualizado" });
        setIsEditOpen(false);
        setIngredientToEdit(null);
    };

    return (
        <>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
            <ScrollArea className="h-[400px] border rounded-md">
                <div className="relative w-full overflow-auto">
                    <Table className="min-w-max">
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
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!canManage}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-glass">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción eliminará permanentemente el ingrediente "{ingredient.name}".
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteConfirm(ingredient)}>Sí, eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                 {!isLoading && filteredIngredients.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No se encontraron ingredientes.
                    </div>
                )}
            </ScrollArea>

            {/* Dialog for Editing */}
            <NewIngredientDialog
                isOpen={isEditOpen}
                onClose={() => { setIsEditOpen(false); setIngredientToEdit(null); }}
                onSave={handleSaveIngredient}
                ingredientToEdit={ingredientToEdit}
            />
        </>
    );
}
