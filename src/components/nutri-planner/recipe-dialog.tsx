'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Flame, EggFried, Wheat, Droplets, Trash2, Edit, PlusCircle, Plus, Copy } from 'lucide-react';
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
import { NewIngredientDialog } from './new-ingredient-dialog';


interface RecipeDialogProps {
  dialogState: DialogState;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
  onEdit: (recipe: Recipe) => void;
  onCopy: (recipe: Recipe) => void;
}

const MacroDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: number, unit: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary">
    <Icon className="h-6 w-6 mb-1 text-primary" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-bold">{Math.round(value)}{unit}</span>
  </div>
);

function RecipeForm({ recipe: initialRecipe, onSave, onCancel, onDelete }: { recipe?: Recipe, onSave: (recipe: Recipe) => void, onCancel: () => void, onDelete: (id: string) => void }) {
  const isEditing = !!initialRecipe;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientDBState, setIngredientDBState] = useState<BaseIngredient[]>(ingredientsDB);
  const [isNewIngredientOpen, setIsNewIngredientOpen] = useState(false);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState(100);

  useEffect(() => {
    setName(initialRecipe?.name || '');
    setDescription(initialRecipe?.description || '');
    setInstructions(initialRecipe?.instructions || '');
    setIngredients(initialRecipe?.ingredients || []);
  }, [initialRecipe]);

  const calculatedTotals = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
      const baseIng = ingredientDBState.find(dbIng => dbIng.name === ing.name);
      if (baseIng) {
        const scale = ing.quantity / 100;
        acc.calories += (baseIng.calories || 0) * scale;
        acc.protein += (baseIng.protein || 0) * scale;
        acc.carbs += (baseIng.carbs || 0) * scale;
        acc.fat += (baseIng.fat || 0) * scale;
      }
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [ingredients, ingredientDBState]);

  const handleSave = () => {
    if (!name) return;
    const recipe: Recipe = {
      id: initialRecipe?.id || '', // Keep ID if editing, otherwise it will be set on save
      name,
      description,
      instructions,
      ingredients,
      ...calculatedTotals
    };
    onSave(recipe);
  };
  
  const handleSelectIngredient = (ingredientName: string) => {
    setNewIngredientName(ingredientName);
    setPopoverOpen(false);
  };
  
  const addIngredient = () => {
    const baseIng = ingredientDBState.find(i => i.name.toLowerCase() === newIngredientName.toLowerCase());
    
    if (!baseIng) return; // Should not happen if selected from list

    const newIng: Ingredient = {
      id: self.crypto.randomUUID(),
      name: baseIng.name,
      quantity: newIngredientQty,
      unit: 'g',
       // Store base values per 100g, calculation will be done in useMemo
      calories: baseIng.calories || 0,
      protein: baseIng.protein || 0,
      carbs: baseIng.carbs || 0,
      fat: baseIng.fat || 0,
    };

    setIngredients(prev => [...prev, newIng]);
    setNewIngredientName('');
    setNewIngredientQty(100);
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };
  
  const handleNewIngredientSave = (newIngredient: BaseIngredient) => {
    setIngredientDBState(prev => [...prev, newIngredient]);
    setNewIngredientName(newIngredient.name);
    setIsNewIngredientOpen(false);
    setTimeout(() => setPopoverOpen(true), 100); // Re-open popover to show new item
  }

  const filteredIngredients = useMemo(() => {
    const lowercasedQuery = newIngredientName.toLowerCase();
    if (!lowercasedQuery) {
        return ingredientDBState.slice().sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return ingredientDBState
        .map(ingredient => {
            const lowercasedName = ingredient.name.toLowerCase();
            const startsWith = lowercasedName.startsWith(lowercasedQuery);
            const includes = lowercasedName.includes(lowercasedQuery);
            
            if (!includes) return null;

            let score = 0;
            if (startsWith) score = 2;
            else if (includes) score = 1;
            
            return { ...ingredient, score };
        })
        .filter(item => item !== null)
        .sort((a, b) => {
          if (!a || !b) return 0;
          if (b.score !== a.score) {
              return b.score - a.score;
          }
          return a.name.localeCompare(b.name);
        }) as BaseIngredient[];
  }, [newIngredientName, ingredientDBState]);


  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</DialogTitle>
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
                 <div className="flex gap-1">
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Input value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} onFocus={() => setPopoverOpen(true)} placeholder="Buscar ingrediente..." />
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar ingrediente..." />
                                <CommandList>
                                    <CommandEmpty>
                                      <div className="p-4 text-sm text-center">
                                        <p>No se encontraron resultados.</p>
                                        <Button variant="link" className="h-auto p-0 mt-1" onClick={() => { setPopoverOpen(false); setIsNewIngredientOpen(true); }}>
                                          Crear nuevo alimento
                                        </Button>
                                      </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {filteredIngredients.map((ing) => (
                                            <CommandItem key={ing.name} value={ing.name} onSelect={handleSelectIngredient}>
                                                {ing.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
              </div>
              <div className="w-24">
                <Label className="text-xs">Cantidad (g/ml)</Label>
                <Input type="number" value={newIngredientQty} onChange={e => setNewIngredientQty(parseFloat(e.target.value) || 0)} />
              </div>
              <Button size="icon" onClick={addIngredient} disabled={!newIngredientName}><PlusCircle className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {ingredients.map(ing => (
                  <div key={ing.id} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                    <span>{ing.quantity}{ing.unit} <strong>{ing.name}</strong></span>
                    <Badge variant="outline">{Math.round(ing.calories * (ing.quantity/100))} kcal</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIngredient(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <MacroDisplay label="Calorías" value={calculatedTotals.calories} unit="kcal" icon={Flame} />
            <MacroDisplay label="Proteína" value={calculatedTotals.protein} unit="g" icon={EggFried} />
            <MacroDisplay label="Carbs" value={calculatedTotals.carbs} unit="g" icon={Wheat} />
            <MacroDisplay label="Grasa" value={calculatedTotals.fat} unit="g" icon={Droplets} />
          </div>
        </div>
      </div>
      <DialogFooter className="justify-between">
        {isEditing && initialRecipe?.id ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la receta de tu biblioteca y de todos los planes de comidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(initialRecipe.id)}>Borrar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        ) : <div></div> }
        <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Receta</Button>
        </div>
      </DialogFooter>
      <NewIngredientDialog
        isOpen={isNewIngredientOpen}
        onClose={() => setIsNewIngredientOpen(false)}
        onSave={handleNewIngredientSave}
      />
    </>
  );
}


function RecipeView({ recipe, onEdit, onDelete, onCopy, isNutriPlannerRecipe }: { recipe: Recipe; onEdit: (recipe: Recipe) => void; onDelete: (id: string) => void; onCopy: (recipe: Recipe) => void; isNutriPlannerRecipe: boolean }) {
  return (
     <>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        <DialogDescription>{recipe.description}</DialogDescription>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-accent flex items-center justify-center">
            <h3 className="text-2xl font-bold text-accent-foreground p-4 text-center">{recipe.name}</h3>
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
      <DialogFooter className="mt-6 justify-between">
         {!isNutriPlannerRecipe ? (
          <AlertDialog>
              <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente la receta de tu biblioteca y de todos los planes de comidas.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(recipe.id)}>Borrar</AlertDialogAction>
              </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        ) : <div></div>}
        
        {isNutriPlannerRecipe ? (
          <Button onClick={() => onCopy(recipe)}><Copy className="mr-2 h-4 w-4" /> Copiar a Mis Recetas</Button>
        ) : (
          <Button variant="outline" onClick={() => onEdit(recipe)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
        )}
      </DialogFooter>
    </>
  )
}


export function RecipeDialog({ dialogState, onClose, onSave, onDelete, onEdit, onCopy }: RecipeDialogProps) {
  if (!dialogState.open) return null;
  const isNutriPlannerRecipe = dialogState.mode === 'view' && dialogState.isNutriPlannerRecipe;

  return (
    <Dialog open={dialogState.open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        {dialogState.mode === 'view' && dialogState.recipe ? (
          <RecipeView 
            recipe={dialogState.recipe} 
            onEdit={onEdit}
            onDelete={onDelete}
            onCopy={onCopy}
            isNutriPlannerRecipe={!!isNutriPlannerRecipe}
          />
        ) : (
          <RecipeForm
            recipe={dialogState.mode === 'edit' ? dialogState.recipe : undefined}
            onSave={onSave}
            onCancel={onClose}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

    