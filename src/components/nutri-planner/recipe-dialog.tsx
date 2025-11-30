'use client';

import { useState, useMemo, useEffect } from 'react';
import type { DialogState as DialogStateBase, Recipe, Ingredient, Folder, GlobalFolder, BaseIngredient } from '@/lib/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase/index';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection } from 'firebase/firestore';
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
import { Flame, EggFried, Wheat, Droplets, Trash2, Edit, Plus, Copy, Search, Image as ImageIcon, UploadCloud, Globe, Folder as FolderIcon } from 'lucide-react';
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
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { normalizeText, cn } from '@/lib/utils';

export type DialogState = DialogStateBase;

interface RecipeDialogProps {
  dialogState: DialogState;
  isSaving?: boolean;
  folders?: Folder[];
  globalFolders?: GlobalFolder[];
  onClose: () => void;
  onSave?: (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => void;
  onDelete?: (recipeId: string, isGlobal: boolean) => void;
  onEdit?: (recipe: Recipe, isNutriPlannerRecipe?: boolean) => void;
  onCopy?: (recipe: Recipe) => void;
  isMobile?: boolean;
}

const MacroDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: number, unit: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-black/10">
    <Icon className="h-6 w-6 mb-1 text-primary" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-bold">{Math.round(value)}{unit}</span>
  </div>
);

function RecipeForm({ recipe: initialRecipe, folders, globalFolders, isInitiallyGlobal = false, isSaving, onSave, onCancel, onDelete }: { recipe?: Recipe, folders: Folder[], globalFolders: GlobalFolder[], isInitiallyGlobal?: boolean, isSaving: boolean, onSave: (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => void, onCancel: () => void, onDelete: (id: string, isGlobal: boolean) => void }) {
  const isEditing = !!initialRecipe;
  const { user, isAdmin } = useUser();
  const firestore = useFirestore();

  const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
  const { data: ingredientDB, isLoading: ingredientsLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);
  
  const ingredientDBMap = useMemo(() => {
    const map = new Map<string, BaseIngredient>();
    if (ingredientDB) {
      ingredientDB.forEach(ing => map.set(normalizeText(ing.name), ing));
    }
    return map;
  }, [ingredientDB]);


  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveAsGlobal, setSaveAsGlobal] = useState(isInitiallyGlobal);
  const [folderId, setFolderId] = useState<string>('none');
  
  const [isNewIngredientOpen, setIsNewIngredientOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<BaseIngredient | null>(null);
  const [newIngredientQty, setNewIngredientQty] = useState<number | string>(100);

  useEffect(() => {
    if (initialRecipe) {
        setName(initialRecipe.name);
        setDescription(initialRecipe.description || '');
        setInstructions(initialRecipe.instructions || '');
        // When editing, ensure ingredients are in the clean format.
        setIngredients(initialRecipe.ingredients.map(ing => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
        })) || []);
        setImageUrl(initialRecipe.imageUrl || '');
        setFolderId(initialRecipe.folderId || 'none');
    } else {
        setName('');
        setDescription('');
        setInstructions('');
        setIngredients([]);
        setImageUrl('');
        setFolderId('none');
    }
    setSaveAsGlobal(isInitiallyGlobal);
    setImageFile(null);
  }, [initialRecipe, isInitiallyGlobal]);

  const calculatedTotals = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
        const baseIng = ingredientDBMap.get(normalizeText(ing.name));
        if (!baseIng) return acc;
      
        const scale = ing.quantity / 100;
        acc.calories += (baseIng.calories || 0) * scale;
        acc.protein += (baseIng.protein || 0) * scale;
        acc.carbs += (baseIng.carbs || 0) * scale;
        acc.fat += (baseIng.fat || 0) * scale;
      
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [ingredients, ingredientDBMap]);

  const handleSave = async () => {
    if (!name || !onSave) return;
    
    const recipeData: Omit<Recipe, 'id' | 'imageUrl'> & { imageUrl?: string; folderId?: string | null } = {
      name,
      description,
      instructions,
      ingredients, // Already in clean format { id, name, quantity, unit }
      folderId: folderId === 'none' ? null : folderId,
      ...calculatedTotals
    };

    onSave(recipeData as Omit<Recipe, 'id'>, imageFile, saveAsGlobal, initialRecipe?.id);
  };
  
  const handleSelectIngredient = (ingredient: BaseIngredient) => {
    setSearchQuery('');
    setSelectedIngredient(ingredient);
  };
  
  const addIngredient = () => {
    if (!selectedIngredient) return;

    // Only store reference data, not the macros
    const newIng: Ingredient = {
      id: self.crypto.randomUUID(), // Unique instance ID for this ingredient in this recipe
      name: selectedIngredient.name,
      quantity: Number(newIngredientQty) || 100,
      unit: 'g',
    };

    setIngredients(prev => [...prev, newIng]);
    setSelectedIngredient(null);
    setNewIngredientQty(100);
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };
  
  const handleNewIngredientSave = (newIngredientData: Omit<BaseIngredient, 'id'> & { createdBy: string }) => {
    if (!ingredientsCollectionRef) return;
    
    // Optimistically add to UI while it saves in the background
    addDocumentNonBlocking(ingredientsCollectionRef, newIngredientData).then(docRef => {
        // After saving, you could update the ingredientDB or re-fetch,
        // but for now, optimistic update is enough.
        if (docRef) {
          const newOptimisticIngredient: BaseIngredient = { ...newIngredientData, id: docRef.id };
          setSelectedIngredient(newOptimisticIngredient);
        }
    });

    setIsNewIngredientOpen(false);
  }
  
  const ingredientDisplayList = useMemo(() => {
    return ingredients.map(ing => {
        const baseIng = ingredientDBMap.get(normalizeText(ing.name));
        const scale = ing.quantity / 100;
        const calories = baseIng ? (baseIng.calories || 0) * scale : 0;
        return {
            ...ing,
            calories,
        };
    });
  }, [ingredients, ingredientDBMap]);


  const filteredIngredients = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    if (!normalizedQuery) return [];
    
    return (ingredientDB || [])
        .filter(ingredient => normalizeText(ingredient.name).includes(normalizedQuery))
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
              <Label htmlFor="folder">Carpeta</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Seleccionar carpeta..." />
                </SelectTrigger>
                <SelectContent className="bg-glass">
                  <SelectItem value="none">Sin carpeta</SelectItem>
                  {(saveAsGlobal ? (globalFolders || []) : (folders || [])).map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <Card className="bg-transparent">
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
                                <Card className="p-2 bg-glass">
                                    {filteredIngredients.length > 0 ? (
                                        filteredIngredients.map((ing) => (
                                            <div key={ing.id} onClick={() => handleSelectIngredient(ing)} className="p-2 hover:bg-black/10 rounded-md cursor-pointer text-sm">
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
                            <div className="flex gap-2 items-end bg-black/10 p-2 rounded-md">
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
                            <ScrollArea className="h-36 border border-white/10 rounded-lg p-2">
                                <div className="space-y-2 pr-2">
                                    {ingredientDisplayList.map(ing => (
                                    <div key={ing.id} className="flex items-center justify-between bg-black/10 p-2 rounded-md text-sm">
                                        <span>{ing.quantity}{ing.unit} <strong>{ing.name}</strong></span>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-xs text-muted-foreground'>{Math.round(ing.calories)} kcal</span>
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
                <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-3">
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
        {isEditing && initialRecipe?.id && onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-glass">
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Receta'}
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


function RecipeView({ recipe, folders, globalFolders, onEdit, onDelete, onCopy, isNutriPlannerRecipe, isMobile }: { recipe: Recipe; folders?: Folder[], globalFolders?: GlobalFolder[], onEdit?: (recipe: Recipe, isNutriPlannerRecipe?: boolean) => void; onDelete?: (id: string, isGlobal: boolean) => void; onCopy?: (recipe: Recipe) => void; isNutriPlannerRecipe: boolean; isMobile?: boolean; }) {
  const { user, isAdmin } = useUser();
  const firestore = useFirestore();

  const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
  const { data: ingredientDB } = useCollection<BaseIngredient>(ingredientsCollectionRef);
  
  const ingredientDBMap = useMemo(() => {
    const map = new Map<string, BaseIngredient>();
    if (ingredientDB) {
      ingredientDB.forEach(ing => map.set(normalizeText(ing.name), ing));
    }
    return map;
  }, [ingredientDB]);

  const folderName = useMemo(() => {
    if (!recipe.folderId || (!folders && !globalFolders)) return null;
    const allFolders = [...(folders || []), ...(globalFolders || [])];
    return allFolders.find(f => f.id === recipe.folderId)?.name;
  }, [recipe, folders, globalFolders]);

  const canEdit = isAdmin || !isNutriPlannerRecipe;

  return (
     <>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <DialogDescription>{recipe.description}</DialogDescription>
          {folderName && (
              <div className="flex items-center gap-1 bg-accent/20 text-accent-foreground/80 px-2 py-1 rounded-md text-xs">
                <FolderIcon className="h-3 w-3" />
                <span>{folderName}</span>
              </div>
            )}
        </div>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-black/10 flex items-center justify-center text-muted-foreground">
             {recipe.imageUrl ? (
              <Image 
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                sizes="50vw"
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
                {recipe.ingredients.map(ing => {
                  // Always look up the ingredient in the DB map to get live macros
                  const baseIng = ingredientDBMap.get(normalizeText(ing.name));
                  const scale = baseIng ? ing.quantity / 100 : 0;
                  const calories = baseIng ? (baseIng.calories || 0) * scale : 0;
                  return (
                    <li key={ing.id}>
                        {ing.quantity}{ing.unit} {ing.name}
                        {baseIng && <span className="text-xs text-muted-foreground ml-2">({Math.round(calories)} kcal)</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Instrucciones</h3>
              <p className="text-sm whitespace-pre-wrap">{recipe.instructions}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
      <DialogFooter className="mt-6 flex flex-row justify-between items-center w-full">
         <div className="flex gap-2">
            {onDelete && canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-glass">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente la receta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(recipe.id, isNutriPlannerRecipe)}>Borrar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
         </div>

        <div className='flex gap-2'>
          {isNutriPlannerRecipe && onCopy && (
            <Button onClick={() => onCopy(recipe)}>
              <Copy className="mr-2 h-4 w-4" /> Copiar a Mis Recetas
            </Button>
          )}
          {canEdit && onEdit && (
            <Button variant="outline" onClick={() => onEdit(recipe, isNutriPlannerRecipe)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  )
}


export function RecipeDialog({ dialogState, isSaving = false, folders, globalFolders, onClose, onSave, onDelete, onEdit, onCopy, isMobile }: RecipeDialogProps) {
  if (!dialogState.open) return null;

  const isViewMode = dialogState.mode === 'view';
  const isNutriPlannerRecipe = isViewMode && dialogState.isNutriPlannerRecipe;

  const handleEdit = (recipe: Recipe) => {
    if (onEdit) {
      onEdit(recipe, dialogState.mode === 'view' ? dialogState.isNutriPlannerRecipe : false);
    }
  };
  
  return (
    <Dialog open={dialogState.open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl bg-glass",
        isMobile && "h-[90vh] flex flex-col"
        )}>
        {isViewMode && dialogState.recipe ? (
          <RecipeView 
            recipe={dialogState.recipe} 
            folders={folders}
            globalFolders={globalFolders}
            onEdit={handleEdit}
            onDelete={onDelete}
            onCopy={onCopy}
            isNutriPlannerRecipe={!!isNutriPlannerRecipe}
            isMobile={isMobile}
          />
        ) : (
          <RecipeForm
            recipe={dialogState.mode === 'edit' ? dialogState.recipe : undefined}
            folders={folders || []}
            globalFolders={globalFolders || []}
            isInitiallyGlobal={dialogState.mode === 'edit' ? dialogState.isNutriPlannerRecipe : false}
            isSaving={isSaving}
            onSave={onSave!}
            onCancel={onClose}
            onDelete={onDelete!}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

    