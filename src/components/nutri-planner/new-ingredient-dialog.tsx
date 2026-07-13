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
  const [brand, setBrand] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitWeight, setUnitWeight] = useState<number | ''>('');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [fiber, setFiber] = useState<number | ''>('');

  const isEditing = !!ingredientToEdit;

  useEffect(() => {
    if (isOpen && ingredientToEdit) {
      setName(ingredientToEdit.name || '');
      setBrand(ingredientToEdit.brand || '');
      setUnitName(ingredientToEdit.unitName || '');
      setUnitWeight(ingredientToEdit.unitWeight ?? '');
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
    const trimmedBrand = brand.trim();
    const trimmedUnitName = unitName.trim();
    const parsedUnitWeight = Number(unitWeight) || 0;
    const newIngredient: EditableIngredient = {
      name,
      // Only include optional fields when set — Firestore rejects `undefined`.
      ...(trimmedBrand ? { brand: trimmedBrand } : {}),
      // A usable unit needs both a name and a positive weight.
      ...(trimmedUnitName && parsedUnitWeight > 0
        ? { unitName: trimmedUnitName, unitWeight: parsedUnitWeight }
        : {}),
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
    setBrand('');
    setUnitName('');
    setUnitWeight('');
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
            <Label htmlFor="brand" className="text-right">
              Marca
            </Label>
            <Input id="brand" name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Opcional · ej. Hacendado" className="col-span-3" />
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

          {/* Optional natural unit, so the food can be added to recipes by pieces
              instead of grams (e.g. 1 loncha = 30 g). Macros above stay per 100g. */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <Label className="text-sm font-medium">Unidad <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="unitName" className="text-xs text-muted-foreground">Nombre</Label>
                <Input id="unitName" name="unitName" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="ej. loncha, yogur" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unitWeight" className="text-xs text-muted-foreground">Peso (g)</Label>
                <Input id="unitWeight" name="unitWeight" type="number" value={unitWeight} onChange={handleNumericChange(setUnitWeight)} placeholder="ej. 30" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Para poder añadirlo por piezas. Ej.: 1 loncha = 30 g, así 2 lonchas serán 60 g.
            </p>
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
