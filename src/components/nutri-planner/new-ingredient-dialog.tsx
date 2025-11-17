'use client';

import { useState } from 'react';
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

interface NewIngredientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ingredient: Omit<BaseIngredient, 'id'>) => void;
}

export function NewIngredientDialog({ isOpen, onClose, onSave }: NewIngredientDialogProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [sugar, setSugar] = useState(0);
  const [fiber, setFiber] = useState(0);

  const handleSave = () => {
    if (!name) return;
    const newIngredient: Omit<BaseIngredient, 'id'> = {
      name,
      calories,
      protein,
      carbs,
      fat,
      sugar,
      fiber,
    };
    onSave(newIngredient);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const resetForm = () => {
    setName('');
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setSugar(0);
    setFiber(0);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Alimento</DialogTitle>
          <DialogDescription>
            Introduce los detalles del nuevo alimento por cada 100g.
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
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Alimento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
