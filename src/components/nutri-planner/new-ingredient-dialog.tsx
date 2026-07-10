'use client';

import { useState, useEffect } from 'react';
import type { BaseIngredient } from '@/lib/types';
import { useUser } from '@/firebase/provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type EditableIngredient = Omit<BaseIngredient, 'id' | 'createdBy'> & { id?: string; createdBy?: string };

interface NewIngredientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ingredient: EditableIngredient) => void;
  ingredientToEdit?: EditableIngredient | null;
}

export function NewIngredientDialog({ isOpen, onClose, onSave, ingredientToEdit }: NewIngredientDialogProps) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [fiber, setFiber] = useState<number | ''>('');

  const isEditing = !!ingredientToEdit;

  useEffect(() => {
    if (isOpen && ingredientToEdit) {
      setName(ingredientToEdit.name || '');
      setCalories(ingredientToEdit.calories ?? '');
      setProtein(ingredientToEdit.protein ?? '');
      setCarbs(ingredientToEdit.carbs ?? '');
      setFat(ingredientToEdit.fat ?? '');
      setFiber(ingredientToEdit.fiber ?? '');
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, ingredientToEdit]);

  const handleSave = () => {
    if (!name || !user) return;
    const newIngredient: EditableIngredient = {
      name,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      createdBy: user.uid,
    };
    if (isEditing) {
        newIngredient.id = ingredientToEdit?.id;
    }
    onSave(newIngredient);
    handleClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('');
  };
  
  const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setter('');
    } else {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
            setter(parsed);
        }
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-glass">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Alimento' : 'Añadir Nuevo Alimento'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los detalles del alimento.' : 'Introduce los detalles del nuevo alimento por cada 100g.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="calories" className="text-right">
              Calorías (kcal)
            </Label>
            <Input id="calories" name="calories" type="number" value={calories} onChange={handleNumericChange(setCalories)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="protein" className="text-right">
              Proteínas (g)
            </Label>
            <Input id="protein" name="protein" type="number" value={protein} onChange={handleNumericChange(setProtein)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="carbs" className="text-right">
              Carbohidratos (g)
            </Label>
            <Input id="carbs" name="carbs" type="number" value={carbs} onChange={handleNumericChange(setCarbs)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fat" className="text-right">
              Grasas (g)
            </Label>
            <Input id="fat" name="fat" type="number" value={fat} onChange={handleNumericChange(setFat)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fiber" className="text-right">
              Fibra (g)
            </Label>
            <Input id="fiber" name="fiber" type="number" value={fiber} onChange={handleNumericChange(setFiber)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Alimento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
