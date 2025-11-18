'use client';

import { useState, useEffect } from 'react';
import type { BaseIngredient } from '@/lib/types';
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

type EditableIngredient = Partial<Omit<BaseIngredient, 'id'>> & { id?: string };

interface NewIngredientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ingredient: EditableIngredient) => void;
  ingredientToEdit?: EditableIngredient | null;
}

export function NewIngredientDialog({ isOpen, onClose, onSave, ingredientToEdit }: NewIngredientDialogProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [sugar, setSugar] = useState(0);
  const [fiber, setFiber] = useState(0);

  const isEditing = !!ingredientToEdit;

  useEffect(() => {
    if (isOpen && ingredientToEdit) {
      setName(ingredientToEdit.name || '');
      setCalories(ingredientToEdit.calories || 0);
      setProtein(ingredientToEdit.protein || 0);
      setCarbs(ingredientToEdit.carbs || 0);
      setFat(ingredientToEdit.fat || 0);
      setSugar(ingredientToEdit.sugar || 0);
      setFiber(ingredientToEdit.fiber || 0);
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, ingredientToEdit]);

  const handleSave = () => {
    if (!name) return;
    const newIngredient: EditableIngredient = {
      name,
      calories,
      protein,
      carbs,
      fat,
      sugar,
      fiber,
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
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setSugar(0);
    setFiber(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
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
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="calories" className="text-right">
              Calorías (kcal)
            </Label>
            <Input id="calories" type="number" value={calories} onChange={(e) => setCalories(parseFloat(e.target.value) || 0)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="protein" className="text-right">
              Proteínas (g)
            </Label>
            <Input id="protein" type="number" value={protein} onChange={(e) => setProtein(parseFloat(e.target.value) || 0)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="carbs" className="text-right">
              Carbohidratos (g)
            </Label>
            <Input id="carbs" type="number" value={carbs} onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fat" className="text-right">
              Grasas (g)
            </Label>
            <Input id="fat" type="number" value={fat} onChange={(e) => setFat(parseFloat(e.target.value) || 0)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fiber" className="text-right">
              Fibra (g)
            </Label>
            <Input id="fiber" type="number" value={fiber} onChange={(e) => setFiber(parseFloat(e.target.value) || 0)} className="col-span-3" />
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
