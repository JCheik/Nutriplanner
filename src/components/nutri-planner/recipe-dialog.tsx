'use client';

import { useState, useMemo, useEffect } from 'react';
import type { DialogState, Recipe, Ingredient } from '@/lib/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase/index';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, EggFried, Wheat, Droplets, Trash2, Edit, Plus, Copy, Search, Image as ImageIcon, UploadCloud, Globe } from 'lucide-react';
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
import { Card, CardContent } from '../ui/card';
import Image from 'next/image';
import { uploadImageAndGetUrl } from '@/firebase/storage/image-upload';
import { Switch } from '../ui/switch';


interface RecipeDialogProps {
  dialogState: DialogState;
  onClose: () => void;
  onSave: (recipe: Recipe, isGlobal: boolean) => void;
  onDelete: (recipeId: string, isGlobal: boolean) => void;
  onEdit: (recipe: Recipe, isNutriPlannerRecipe?: boolean) => void;
  onCopy: (recipe: Recipe) => void;
}

const MacroDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: number, unit: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-secondary">
    <Icon className="h-6 w-6 mb-1 text-primary" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-bold">{Math.round(value)}{unit}</span>
  </div>
);

function RecipeForm({ recipe: initialRecipe, isInitiallyGlobal = false, onSave, onCancel, onDelete }: { recipe?: Recipe, isInitiallyGlobal?: boolean, onSave: (recipe: Recipe, isGlobal: boolean) => void, onCancel: () => void, onDelete: (id: string, isGlobal: boolean) => void }) {
  const isEditing = !!initialRecipe;
  const { user, claims } = useUser();
  const isAdmin = claims?.admin === true;
  const firestore = useFirestore();

  const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
  const { data: ingredientDB, isLoading: ingredientsLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [saveAsGlobal, setSaveAsGlobal] = useState(isInitiallyGlobal);
  
  const [isNewIngredientOpen, setIsNewIngredientOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<BaseIngredient | null>(null);
  const [newIngredientQty, setNewIngredientQty] = useState<number | string>(100);

  useEffect(() => {
    if (initialRecipe) {
        setName(initialRecipe.name);
        setDescription(initialRecipe.description || '');
        setInstructions(initialRecipe.instructions || '');
        setIngredients(initialRecipe.ingredients || []);
        setImageUrl(initialRecipe.imageUrl || '');
    } else {
        setName('');
        setDescription('');
        setInstructions('');
        setIngredients([]);
        setImageUrl('');
    }
    setSaveAsGlobal(isInitiallyGlobal);
    setImageFile(null);
  }, [initialRecipe, isInitiallyGlobal]);

  const calculatedTotals = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
        const scale = ing.quantity / 100;
        acc.calories += (ing.calories || 0) * scale;
        acc.protein += (ing.protein || 0) * scale;
        acc.carbs += (ing.carbs || 0) * scale;
        acc.fat += (ing.fat || 0) * scale;
      
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [ingredients]);

  const handleSave = async () => {
    if (!name || !firestore) return;
    
    setIsUploading(true);
    const recipeId = initialRecipe?.id || doc(collection(firestore!, 'dummy')).id;
    let finalImageUrl = imageUrl || '';

    try {
        if (imageFile) {
            finalImageUrl = await uploadImageAndGetUrl(imageFile, recipeId);
        }

        const recipe: Recipe = {
          id: recipeId,
          name,
          description,
          instructions,
          ingredients,
          imageUrl: finalImageUrl,
          ...calculatedTotals
        };

        await onSave(recipe, saveAsGlobal);

    } catch (error) {
        console.error("Error during save process:", error);
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleSelectIngredient = (ingredient: BaseIngredient) => {
    setSearchQuery('');
    setSelectedIngredient(ingredient);
  };
  
  const addIngredient = () => {
    if (!selectedIngredient) return;

    const newIng: Ingredient = {
      id: self.crypto.randomUUID(),
      name: selectedIngredient.name,
      quantity: Number(newIngredientQty) || 100,
      unit: 'g',
      calories: selectedIngredient.calories || 0,
      protein: selectedIngredient.protein || 0,
      carbs: selectedIngredient.carbs || 0,
      fat: selectedIngredient.fat || 0,
    };

    setIngredients(prev => [...prev, newIng]);
    setSelectedIngredient(null);
    setNewIngredientQty(100);
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };
  
  const handleNewIngredientSave = (newIngredient: Omit<BaseIngredient, 'id' | 'createdBy'> & { createdBy: string }) => {
    if (!ingredientsCollectionRef) return;
    
    const newId = addDocumentNonBlocking(ingredientsCollectionRef, newIngredient).then(docRef => docRef.id);

    const optimisticIngredient: BaseIngredient = {
      ...newIngredient,
      id: `optimistic-${self.crypto.randomUUID()}`
    }

    setSelectedIngredient(optimisticIngredient);
    setIsNewIngredientOpen(false);
  }

  const filteredIngredients = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    if (!lowercasedQuery) return [];
    
    return (ingredientDB || [])
        .filter(ingredient => ingredient.name.toLowerCase().includes(lowercasedQuery))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 5);
  }, [searchQuery, ingredientDB]);


  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</DialogTitle>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-8 py-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la Receta</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
            {isAdmin && (
             <div>
                <Label htmlFor="imageFile">Subir o cambiar imagen</Label>
                <div className="flex items-center gap-2 mt-1">
                    <Input 
                        id="imageFile" 
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={e => e.target.files && setImageFile(e.target.files[0])}
                        className="flex-1"
                    />
                    <UploadCloud className="h-5 w-5 text-muted-foreground" />
                </div>
                {imageFile && <p className="text-xs text-muted-foreground mt-1">Nuevo archivo: {imageFile.name}</p>}
             </div>
            )}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="instructions">Instrucciones</Label>
            <Textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} className="h-48" />
          </div>
        </div>
        <div className="space-y-4">
            <div className="space-y-3">
                <Label>Ingredientes</Label>
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                             <Label>1. Buscar y añadir ingrediente</Label>
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar ingrediente..."
                                    className="pl-10"
                                />
                             </div>
                            {searchQuery && (
                                <Card className="p-2">
                                    {filteredIngredients.length > 0 ? (
                                        filteredIngredients.map((ing) => (
                                            <div key={ing.id} onClick={() => handleSelectIngredient(ing)} className="p-2 hover:bg-secondary rounded-md cursor-pointer text-sm">
                                                {ing.name}
                                            </div>
                                        ))
                                    ) : !ingredientsLoading && (
                                        <div className="p-4 text-sm text-center">
                                            <p>No se encontraron resultados.</p>
                                            <Button variant="link" className="h-auto p-0 mt-1" onClick={() => { setIsNewIngredientOpen(true); }}>
                                                Crear nuevo alimento
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            )}
                        </div>

                        {selectedIngredient && (
                            <div className="flex gap-2 items-end bg-secondary/50 p-2 rounded-md">
                                <div className="flex-grow">
                                    <Label className="text-xs">Ingrediente seleccionado</Label>
                                    <p className="font-semibold">{selectedIngredient.name}</p>
                                </div>
                                <div className="w-24">
                                    <Label htmlFor='qty' className="text-xs">Cantidad (g)</Label>
                                    <Input id='qty' type="number" value={newIngredientQty} onChange={e => setNewIngredientQty(e.target.value)} />
                                </div>
                                <Button size="icon" onClick={addIngredient}><Plus className="h-4 w-4" /></Button>
                            </div>
                        )}
                        
                        <div className='space-y-2'>
                            <Label>2. Ingredientes de la Receta</Label>
                            <ScrollArea className="h-36 border rounded-lg p-2">
                                <div className="space-y-2 pr-2">
                                    {ingredients.map(ing => (
                                    <div key={ing.id} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                                        <span>{ing.quantity}{ing.unit} <strong>{ing.name}</strong></span>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-xs text-muted-foreground'>{Math.round(ing.calories * (ing.quantity/100))} kcal</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIngredient(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center pt-8">Añade ingredientes para verlos aquí.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div>
                 <Label>Totales de la Receta</Label>
                <div className="grid grid-cols-4 gap-2 text-center mt-1">
                    <MacroDisplay label="Calorías" value={calculatedTotals.calories} unit="kcal" icon={Flame} />
                    <MacroDisplay label="Proteína" value={calculatedTotals.protein} unit="g" icon={EggFried} />
                    <MacroDisplay label="Carbs" value={calculatedTotals.carbs} unit="g" icon={Wheat} />
                    <MacroDisplay label="Grasa" value={calculatedTotals.fat} unit="g" icon={Droplets} />
                </div>
            </div>
             {isAdmin && (
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                        <Label htmlFor="global-recipe-switch">Guardar como receta global de NutriPlanner</Label>
                        <p className="text-xs text-muted-foreground">La receta será visible para todos los usuarios.</p>
                    </div>
                    <Switch
                        id="global-recipe-switch"
                        checked={saveAsGlobal}
                        onCheckedChange={setSaveAsGlobal}
                    />
                </div>
            )}

        </div>
      </div>
      <DialogFooter className="justify-between pt-4">
        {isEditing && initialRecipe?.id ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
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
                  <AlertDialogAction onClick={() => onDelete(initialRecipe.id, saveAsGlobal)}>Borrar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        ) : <div></div> }
        <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isUploading}>
              {isUploading ? 'Guardando...' : 'Guardar Receta'}
            </Button>
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


function RecipeView({ recipe, onEdit, onDelete, onCopy, isNutriPlannerRecipe }: { recipe: Recipe; onEdit: (recipe: Recipe, isNutriPlannerRecipe?: boolean) => void; onDelete: (id: string, isGlobal: boolean) => void; onCopy: (recipe: Recipe) => void; isNutriPlannerRecipe: boolean }) {
  const { claims } = useUser();
  const isAdmin = claims?.admin === true;

  return (
     <>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        <DialogDescription>{recipe.description}</DialogDescription>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-secondary flex items-center justify-center text-muted-foreground">
             {recipe.imageUrl ? (
              <Image 
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                className="object-cover"
                data-ai-hint={recipe.imageHint}
              />
            ) : (
                <div className="text-center">
                    <ImageIcon className="h-10 w-10 mx-auto" />
                    <p>No hay imagen</p>
                </div>
            )}
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
         {!isNutriPlannerRecipe && isAdmin ? (
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
                  <AlertDialogAction onClick={() => onDelete(recipe.id, false)}>Borrar</AlertDialogAction>
              </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        ) : <div></div>}
        
        <div className='flex gap-2'>
          {isNutriPlannerRecipe && (
            <Button onClick={() => onCopy(recipe)}><Copy className="mr-2 h-4 w-4" /> Copiar a Mis Recetas</Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => onEdit(recipe, isNutriPlannerRecipe)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
          )}
          {!isNutriPlannerRecipe && !isAdmin && (
            <Button variant="outline" onClick={() => onEdit(recipe, false)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
          )}
        </div>
      </DialogFooter>
    </>
  )
}


export function RecipeDialog({ dialogState, onClose, onSave, onDelete, onEdit, onCopy }: RecipeDialogProps) {
  if (!dialogState.open) return null;

  const isViewMode = dialogState.mode === 'view';
  const isNutriPlannerRecipe = isViewMode && dialogState.isNutriPlannerRecipe;

  const handleEdit = (recipe: Recipe) => {
    onEdit(recipe, dialogState.mode === 'view' ? dialogState.isNutriPlannerRecipe : false);
  };
  
  return (
    <Dialog open={dialogState.open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        {isViewMode && dialogState.recipe ? (
          <RecipeView 
            recipe={dialogState.recipe} 
            onEdit={handleEdit}
            onDelete={onDelete}
            onCopy={onCopy}
            isNutriPlannerRecipe={!!isNutriPlannerRecipe}
          />
        ) : (
          <RecipeForm
            recipe={dialogState.mode === 'edit' ? dialogState.recipe : undefined}
            isInitiallyGlobal={dialogState.mode === 'edit' ? dialogState.isNutriPlannerRecipe : false}
            onSave={onSave}
            onCancel={onClose}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
