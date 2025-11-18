'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { BaseIngredient } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search, Edit, Trash2 } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { NewIngredientDialog } from './new-ingredient-dialog';
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

interface IngredientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function IngredientDatabaseViewer() {
    const { user } = useUser();
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
        setIngredientToEdit(ingredient);
        setIsEditOpen(true);
    };
    
    const handleSaveIngredient = (ingredientData: Partial<BaseIngredient>) => {
        if (!firestore || !ingredientData.id || !user) return;
        const { id, ...data } = ingredientData;
        const ingredientRef = doc(firestore, 'ingredients', id);
        setDocumentNonBlocking(ingredientRef, { ...data, createdBy: user.uid }, { merge: true });
        setIsEditOpen(false);
        setIngredientToEdit(null);
    };

    const handleDeleteIngredient = (ingredientId: string) => {
        if (!firestore) return;
        const ingredientRef = doc(firestore, 'ingredients', ingredientId);
        deleteDocumentNonBlocking(ingredientRef);
    }

    return (
        <>
            <div className="space-y-4">
                <div className="relative">
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
                    {isLoading && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center">Cargando ingredientes...</TableCell>
                        </TableRow>
                    )}
                    {filteredIngredients.length > 0 ? (
                        filteredIngredients.map((ingredient) => {
                            const canModify = user && ingredient.createdBy === user.uid;
                            return (
                                <TableRow key={ingredient.id}>
                                <TableCell className="font-medium">{ingredient.name}</TableCell>
                                <TableCell className="text-right">{ingredient.calories}</TableCell>
                                <TableCell className="text-right">{ingredient.protein}</TableCell>
                                <TableCell className="text-right">{ingredient.carbs}</TableCell>
                                <TableCell className="text-right">{ingredient.fat}</TableCell>
                                <TableCell className="text-right">{ingredient.fiber || 0}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(ingredient)} disabled={!canModify}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!canModify}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción eliminará permanentemente el ingrediente "{ingredient.name}" de la base de datos.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteIngredient(ingredient.id)}>Borrar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                                </TableRow>
                            );
                        })
                    ) : !isLoading && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center">No se encontraron ingredientes.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </ScrollArea>
            </div>
            <NewIngredientDialog 
                isOpen={isEditOpen}
                onClose={() => { setIsEditOpen(false); setIngredientToEdit(null); }}
                onSave={handleSaveIngredient}
                ingredientToEdit={ingredientToEdit}
            />
        </>
    )
}

export function IngredientsDialog({ isOpen, onClose }: IngredientsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Base de Datos de Ingredientes</DialogTitle>
          <DialogDescription>
             Esta tabla muestra los datos actuales de la colección <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">/ingredients</code> en Firestore.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <IngredientDatabaseViewer />
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
