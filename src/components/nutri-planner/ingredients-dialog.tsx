'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { BaseIngredient } from '@/lib/types';
import { collection } from 'firebase/firestore';

interface IngredientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function IngredientDatabaseViewer() {
    const firestore = useFirestore();
    const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
    const { data: ingredients, isLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);

    return (
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Calorías</TableHead>
                <TableHead className="text-right">Proteína (g)</TableHead>
                <TableHead className="text-right">Carbs (g)</TableHead>
                <TableHead className="text-right">Grasa (g)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Cargando ingredientes...</TableCell>
                </TableRow>
              )}
              {ingredients?.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell className="text-right">{ingredient.calories}</TableCell>
                  <TableCell className="text-right">{ingredient.protein}</TableCell>
                  <TableCell className="text-right">{ingredient.carbs}</TableCell>
                  <TableCell className="text-right">{ingredient.fat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
    )
}

export function IngredientsDialog({ isOpen, onClose }: IngredientsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
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
