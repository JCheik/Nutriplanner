'use client';

import { useState, useMemo } from 'react';
import type { DialogState, Recipe, Ingredient } from '@/lib/types';
import { ingredientsDB, type BaseIngredient } from '@/lib/ingredients';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Flame, EggFried, Wheat, Droplets, Trash2, Edit, PlusCircle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
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

interface RecipeDialogProps {
  dialogState: DialogState;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
  onEdit: (recipe: Recipe) => void;
}

const MacroDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: number, unit: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary">
    <Icon className="h-6 w-6 mb-1 text-primary" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-bold">{Math.round(value)}{unit}</span>
  </div>
);

function RecipeView({ recipe, onEdit, onDelete }: { recipe: Recipe, onEdit: (recipe: Recipe) => void, onDelete: (recipeId: string) => void }) {
  return (
    <>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        <DialogDescription>{recipe.description}</DialogDescription>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
            <Image src={recipe.imageUrl || `https://picsum.photos/seed/${recipe.id}/400/300`} alt={recipe.name} layout="fill" objectFit="cover" data-ai-hint="food meal"/>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <MacroDisplay label="Calorías" value={recipe.calories} unit="kcal" icon={Flame} />
            <MacroDisplay label="Proteína" value={recipe.protein} unit="g" icon={EggFried} />
            <MacroDisplay label="Carbs" value={recipe.carbs} unit="g" icon={Wheat} />
            <MacroDisplay label="Grasa" value={recipe.fat} unit="g" icon={Droplets} />
          </div>
        </div>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Ingredientes</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {recipe.ingredients.map(ing => (
                  <li key={ing.id}>{ing.quantity}{ing.unit} {ing.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Instrucciones</h3>
              <p className="text-sm whitespace-pre-wrap">{recipe.instructions}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
      <DialogFooter className="mt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mr-auto"><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la receta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(recipe.id)}>Borrar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" onClick={() => onEdit(recipe)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
      </DialogFooter>
    </>
  );
}

function RecipeForm({ recipe: initialRecipe, onSave, onCancel }: { recipe?: Recipe, onSave: (recipe: Recipe) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialRecipe?.name || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [instructions, setInstructions] = useState(initialRecipe?.instructions || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialRecipe?.ingredients || []);
  const [open, setOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState(100);

  const totals = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
      acc.calories += ing.calories;
      acc.protein += ing.protein;
      acc.carbs += ing.carbs;
      acc.fat += ing.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [ingredients]);

  const handleSave = () => {
    if (!name) return;
    const recipe: Recipe = {
      id: initialRecipe?.id || self.crypto.randomUUID(),
      name,
      description,
      instructions,
      ingredients,
      ...totals,
      imageUrl: initialRecipe?.imageUrl,
    };
    onSave(recipe);
  };
  
  const handleSelectIngredient = (baseIngredient: BaseIngredient) => {
    setNewIngredientName(baseIngredient.name);
    setOpen(false);
  };
  
  const addIngredient = () => {
    const baseIng = ingredientsDB.find(i => i.name === newIngredientName);
    if (!baseIng) return;

    const scale = newIngredientQty / 100;
    const newIng: Ingredient = {
      id: self.crypto.randomUUID(),
      name: baseIng.name,
      quantity: newIngredientQty,
      unit: baseIng.unit,
      calories: baseIng.calories * scale,
      protein: baseIng.protein * scale,
      carbs: baseIng.carbs * scale,
      fat: baseIng.fat * scale,
    };

    setIngredients(prev => [...prev, newIng]);
    setNewIngredientName('');
    setNewIngredientQty(100);
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };


  return (
    <>
      <DialogHeader>
        <DialogTitle>{initialRecipe ? 'Editar Receta' : 'Crear Nueva Receta'}</DialogTitle>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la Receta</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="instructions">Instrucciones</Label>
            <Textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} className="h-40" />
          </div>
        </div>
        <div className="space-y-4">
          <Label>Ingredientes</Label>
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <Label className="text-xs">Ingrediente</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Input value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} placeholder="Buscar ingrediente..." />
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar ingrediente..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                        <CommandGroup>
                          {ingredientsDB.map((ing) => (
                            <CommandItem key={ing.name} onSelect={() => handleSelectIngredient(ing)}>
                              {ing.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-24">
                <Label className="text-xs">Cantidad (g/ml)</Label>
                <Input type="number" value={newIngredientQty} onChange={e => setNewIngredientQty(parseFloat(e.target.value))} />
              </div>
              <Button size="icon" onClick={addIngredient}><PlusCircle className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {ingredients.map(ing => (
                  <div key={ing.id} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                    <span>{ing.quantity}{ing.unit} <strong>{ing.name}</strong></span>
                    <Badge variant="outline">{Math.round(ing.calories)} kcal</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIngredient(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <MacroDisplay label="Calorías" value={totals.calories} unit="kcal" icon={Flame} />
            <MacroDisplay label="Proteína" value={totals.protein} unit="g" icon={EggFried} />
            <MacroDisplay label="Carbs" value={totals.carbs} unit="g" icon={Wheat} />
            <MacroDisplay label="Grasa" value={totals.fat} unit="g" icon={Droplets} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar Receta</Button>
      </DialogFooter>
    </>
  );
}

export function RecipeDialog({ dialogState, onClose, onSave, onDelete, onEdit }: RecipeDialogProps) {
  if (!dialogState.open) return null;

  return (
    <Dialog open={dialogState.open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        {dialogState.mode === 'view' && dialogState.recipe ? (
          <RecipeView recipe={dialogState.recipe} onEdit={onEdit} onDelete={onDelete} />
        ) : (
          <RecipeForm
            recipe={dialogState.mode === 'edit' ? dialogState.recipe : undefined}
            onSave={onSave}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
