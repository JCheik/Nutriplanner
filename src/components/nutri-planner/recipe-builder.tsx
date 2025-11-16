'use client';

import { useState, useMemo } from 'react';
import type { Recipe, Ingredient } from '@/lib/types';
import { ingredientsDB, type BaseIngredient } from '@/lib/ingredients';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, EggFried, Wheat, Droplets, Trash2, PlusCircle, ChefHat } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

interface RecipeBuilderProps {
  onSave: (recipe: Recipe) => void;
}

const MacroDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: number, unit: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary flex-1">
    <Icon className="h-5 w-5 mb-1 text-primary" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-bold text-sm">{Math.round(value)}{unit}</span>
  </div>
);

export function RecipeBuilder({ onSave }: RecipeBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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

  const resetForm = () => {
    setName('');
    setDescription('');
    setInstructions('');
    setIngredients([]);
  };

  const handleSave = () => {
    if (!name || ingredients.length === 0) return;
    const newRecipe: Recipe = {
      id: self.crypto.randomUUID(),
      name,
      description,
      instructions,
      ingredients,
      ...totals,
      imageUrl: `https://picsum.photos/seed/${self.crypto.randomUUID()}/400/300`,
    };
    onSave(newRecipe);
    resetForm();
  };
  
  const handleSelectIngredient = (baseIngredient: BaseIngredient) => {
    setNewIngredientName(baseIngredient.name);
    setOpen(false);
  };
  
  const addIngredient = () => {
    const baseIng = ingredientsDB.find(i => i.name.toLowerCase() === newIngredientName.toLowerCase());
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ChefHat className="h-6 w-6 text-primary" />
          <CardTitle>Crear Nueva Receta</CardTitle>
        </div>
        <CardDescription>Añade los detalles de tu receta y guárdala en tu biblioteca.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="recipe-name">Nombre de la Receta</Label>
            <Input id="recipe-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Tacos de pollo" />
        </div>
        
        <div className="p-3 border rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Ingredientes</h4>
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <Label className="text-xs">Ingrediente</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Input value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} placeholder="Buscar ingrediente..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }} />
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                <Label className="text-xs">Cant. (g/ml)</Label>
                <Input type="number" value={newIngredientQty} onChange={e => setNewIngredientQty(parseFloat(e.target.value) || 0)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}/>
              </div>
              <Button size="icon" onClick={addIngredient} type="button"><PlusCircle className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="h-36">
              <div className="space-y-2 pr-4">
                {ingredients.map(ing => (
                  <div key={ing.id} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                    <span>{ing.quantity}{ing.unit} <strong>{ing.name}</strong></span>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{Math.round(ing.calories)} kcal</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIngredient(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
        </div>

        <div className="flex gap-2 text-center">
            <MacroDisplay label="Calorías" value={totals.calories} unit="kcal" icon={Flame} />
            <MacroDisplay label="Proteína" value={totals.protein} unit="g" icon={EggFried} />
            <MacroDisplay label="Carbs" value={totals.carbs} unit="g" icon={Wheat} />
            <MacroDisplay label="Grasa" value={totals.fat} unit="g" icon={Droplets} />
        </div>
        
        <Button onClick={handleSave} disabled={!name || ingredients.length === 0} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Guardar Receta
        </Button>
      </CardContent>
    </Card>
  );
}
