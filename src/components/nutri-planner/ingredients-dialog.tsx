'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IngredientDatabaseManager } from './ingredient-database-manager';

interface IngredientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IngredientsDialog({ isOpen, onClose }: IngredientsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-glass">
        <DialogHeader>
          <DialogTitle>Base de Datos de Ingredientes</DialogTitle>
          <DialogDescription>
             Esta tabla muestra los datos actuales de la colección <code className="bg-muted px-1 py-0.5 rounded">/ingredients</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <IngredientDatabaseManager />
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
