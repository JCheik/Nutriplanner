'use client';

import { useState, useEffect, useMemo, type DragEvent, type KeyboardEvent } from 'react';
import type { Recipe, SortCriteria, Folder, GlobalFolder } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipeCard } from './recipe-card';
import { BookHeart, PlusCircle, Search, ArrowUpDown, Copy, Database, Folder as FolderIcon, Plus, Trash2, Folders, Edit, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IngredientsDialog } from './ingredients-dialog';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { useUser } from '@/firebase';

interface RecipeListProps {
  recipes: Recipe[];
  onRecipeClick: (recipe: Recipe) => void;
  onCopyClick?: (recipe: Recipe) => void;
  onAddToPlanClick?: (recipe: Recipe) => void;
  isDraggable: boolean;
  isNutriPlanner?: boolean;
}

interface RecipeLibraryProps {
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  folders: Folder[];
  globalFolders: GlobalFolder[];
  onRecipeAction: (action: 'view' | 'create', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => void;
  onCopyRecipe: (recipe: Recipe) => void;
  onAddToPlan: (recipe: Recipe) => void;
  onFolderCreate: (name: string) => void;
  onFolderUpdate: (id: string, name: string) => void;
  onFolderDelete: (id: string) => void;
  onAssignRecipeToFolder: (recipeId: string, folderId: string | null) => void;
  onGlobalFolderCreate: (name: string) => void;
  onGlobalFolderUpdate: (id: string, name: string) => void;
  onGlobalFolderDelete: (id: string) => void;
  onAssignRecipeToGlobalFolder: (recipeId: string, folderId: string | null) => void;
}

const sortOptions: { value: SortCriteria; label: string }[] = [
    { value: 'name-asc', label: 'Nombre (A-Z)' },
    { value: 'name-desc', label: 'Nombre (Z-A)' },
    { value: 'calories-asc', label: 'Calorías (Bajas a Altas)' },
    { value: 'calories-desc', label: 'Calorías (Altas a Bajas)' },
    { value: 'protein-asc', label: 'Proteína (Baja a Alta)' },
    { value: 'protein-desc', label: 'Proteína (Alta a Baja)' },
    { value: 'carbs-asc', label: 'Carbs (Bajos a Altos)' },
    { value: 'carbs-desc', label: 'Carbs (Altos a Bajos)' },
    { value: 'fat-asc', label: 'Grasa (Baja a Alta)' },
    { value: 'fat-desc', label: 'Grasa (Alta a Baja)' },
];

function NewFolderPopover({ onFolderCreate }: { onFolderCreate: (name: string) => void }) {
  const [folderName, setFolderName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = () => {
    if (folderName.trim()) {
      onFolderCreate(folderName.trim());
      setFolderName('');
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Crear Carpeta
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 bg-glass">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Nueva Carpeta</h4>
            <p className="text-sm text-muted-foreground">
              Dale un nombre a tu nueva carpeta.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="folder-name" className="sr-only">Nombre</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ej: Desayunos"
              className="h-9"
            />
            <Button onClick={handleCreate} disabled={!folderName.trim()}>Crear</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RecipeList({ recipes, onRecipeClick, onCopyClick, onAddToPlanClick, isDraggable, isNutriPlanner = false }: RecipeListProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredAndSortedRecipes = (recipes || []).filter(recipe => {
    const query = filterQuery.toLowerCase();
    if (!query) return true;
    const nameMatch = recipe.name.toLowerCase().includes(query);
    const ingredientMatch = (recipe.ingredients || []).some(ing => ing.name.toLowerCase().includes(query));
    return nameMatch || ingredientMatch;
  }).sort((a, b) => {
    const [key, order] = sortCriteria.split('-') as [keyof Recipe, 'asc' | 'desc'];
    let valA = a[key];
    let valB = b[key];
    
    if (typeof valA === 'string' && typeof valB === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  const handleCardClick = (recipe: Recipe) => {
    if (isMobile && onAddToPlanClick) {
      onAddToPlanClick(recipe);
    } else {
      onRecipeClick(recipe);
    }
  };

  const recipeViewMode = 'grid';

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-2 p-1">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por nombre o ingrediente..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0 w-full sm:w-auto">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-glass">
            <DropdownMenuRadioGroup value={sortCriteria} onValueChange={(value) => setSortCriteria(value as SortCriteria)}>
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value} className="cursor-pointer">
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="flex-1 mt-2">
        <div className={cn(
          "pr-4",
          recipeViewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "flex flex-col gap-3"
        )}>
          {filteredAndSortedRecipes.length > 0 ? (
            filteredAndSortedRecipes.map(recipe => (
              <div key={recipe.id} className="group flex items-center gap-2">
                 {recipeViewMode === 'grid' ? (
                   <div className="aspect-square w-full relative">
                      <RecipeCard 
                        recipe={recipe} 
                        isDraggable={isDraggable && !isMobile}
                        onClick={() => handleCardClick(recipe)}
                      />
                      {onCopyClick && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onCopyClick(recipe);}}
                          className="absolute top-1 right-1 z-10 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 hover:bg-background/80"
                          aria-label="Copiar a Mis Recetas"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                 ) : (
                    <>
                      <RecipeCard 
                        recipe={recipe} 
                        isDraggable={isDraggable && !isMobile}
                        isListView
                        onClick={() => handleCardClick(recipe)}
                      />
                    </>
                 )}
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg h-[250px]">
              <p className="font-semibold">No se encontraron recetas</p>
              <p className="text-sm text-muted-foreground">Prueba a cambiar el filtro o crea una nueva receta.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FolderButton({ 
  name, 
  icon: Icon, 
  onClick, 
  children, 
  onUpdate, 
  isSelected, 
  isDroppable,
  onDragOver,
  onDragLeave,
  onDrop
}: { 
  name: string; 
  icon: React.ElementType; 
  onClick: () => void; 
  children?: React.ReactNode; 
  onUpdate?: (name: string) => void;
  isSelected: boolean;
  isDroppable: boolean;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);
  
  const handleUpdate = () => {
    if (tempName.trim() && tempName !== name && onUpdate) {
      onUpdate(tempName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') {
      setTempName(name);
      setIsEditing(false);
    }
  };
  
  return (
    <div
      onDragOver={isDroppable ? onDragOver : undefined}
      onDragLeave={isDroppable ? onDragLeave : undefined}
      onDrop={isDroppable ? onDrop : undefined}
      className={cn('rounded-md transition-colors')}
    >
      <div className="flex items-center justify-between group hover:bg-accent/50 rounded-md">
        {isEditing ? (
          <div className="flex items-center w-full p-1 gap-1">
             <Input 
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleUpdate}
                autoFocus
                className="h-7 text-sm"
              />
              <Button size="icon" variant="ghost" onClick={handleUpdate} className="h-7 w-7"><Check className="h-4 w-4"/></Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            onClick={onClick} 
            className={cn(
              "w-full justify-start text-left flex-1 h-9", 
              isSelected && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1">{name}</span>
          </Button>
        )}
        
        {!isEditing && children && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center">
            {onUpdate && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4"/></Button>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}


export function RecipeLibrary({ 
  userRecipes, 
  nutriplannerRecipes,
  folders,
  globalFolders,
  onRecipeAction,
  onCopyRecipe,
  onAddToPlan,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onAssignRecipeToFolder,
  onGlobalFolderCreate,
  onGlobalFolderUpdate,
  onGlobalFolderDelete,
  onAssignRecipeToGlobalFolder,
}: RecipeLibraryProps) {
  const { claims } = useUser();
  const isAdmin = claims?.admin === true;
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('user-recipes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');

  const recipesInSelectedFolder = useMemo(() => {
    if (activeTab !== 'user-recipes') return [];
    if (selectedFolderId === 'all') return userRecipes;
    if (selectedFolderId === null) return userRecipes.filter(r => !r.folderId);
    return userRecipes.filter(recipe => recipe.folderId === selectedFolderId);
  }, [userRecipes, selectedFolderId, activeTab]);

  const recipesInSelectedGlobalFolder = useMemo(() => {
    if (activeTab !== 'nutriplanner-recipes') return [];
    if (selectedFolderId === 'all') return nutriplannerRecipes;
    if (selectedFolderId === null) return nutriplannerRecipes.filter(r => !r.folderId);
    return nutriplannerRecipes.filter(recipe => recipe.folderId === selectedFolderId);
  }, [nutriplannerRecipes, selectedFolderId, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedFolderId('all'); // Reset folder selection on tab change
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent/80');
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/80');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/80');
    const recipeData = e.dataTransfer.getData('application/json');
    if (recipeData) {
      const recipe = JSON.parse(recipeData) as Recipe;
      const handler = activeTab === 'user-recipes' ? onAssignRecipeToFolder : onAssignRecipeToGlobalFolder;
      const recipeSource = activeTab === 'user-recipes' ? userRecipes : nutriplannerRecipes;

      if (recipeSource.some(r => r.id === recipe.id)) {
        handler(recipe.id, folderId);
      }
    }
  };
  
  return (
    <>
      <Card className="flex flex-col h-[500px] bg-glass">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3">
                <BookHeart className="h-6 w-6 text-primary" />
                <CardTitle>Biblioteca de Recetas</CardTitle>
              </div>
              <CardDescription>Tu colección de recetas y las sugerencias de NutriPlanner.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
            <div className="flex justify-between items-center pr-1">
              <TabsList>
                <TabsTrigger value="user-recipes">Mis Recetas</TabsTrigger>
                <TabsTrigger value="nutriplanner-recipes">Recetas NutriPlanner</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setIsIngredientsOpen(true)}>
                  <Database className="h-4 w-4" />
                </Button>
                <Button onClick={() => onRecipeAction('create')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Receta
                </Button>
              </div>
            </div>
            <div className="flex-1 mt-2 overflow-hidden">
              <div className="grid lg:grid-cols-5 h-full">
                <div className="col-span-1 border-r pr-4 hidden lg:block">
                   <h3 className="font-semibold text-sm mb-2 px-2">{activeTab === 'user-recipes' ? 'Mis Carpetas' : 'Carpetas Globales'}</h3>
                  <ScrollArea className="h-full">
                    <div className="space-y-1">
                      <FolderButton 
                        name={activeTab === 'user-recipes' ? "Todas mis Recetas" : "Todas"} 
                        icon={Folders} 
                        onClick={() => setSelectedFolderId('all')} 
                        isSelected={selectedFolderId === 'all'}
                        isDroppable={false}
                      />
                      <FolderButton 
                        name="Sin Carpeta" 
                        icon={FolderIcon} 
                        onClick={() => setSelectedFolderId(null)} 
                        isSelected={selectedFolderId === null}
                        isDroppable={true}
                        onDragOver={(e) => handleDragOver(e, null)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, null)}
                      />

                      {(activeTab === 'user-recipes' ? folders : globalFolders).map(folder => (
                        <FolderButton 
                          key={folder.id} 
                          name={folder.name} 
                          icon={FolderIcon} 
                          onClick={() => setSelectedFolderId(folder.id)} 
                          isSelected={selectedFolderId === folder.id}
                          onUpdate={(newName) => activeTab === 'user-recipes' ? onFolderUpdate(folder.id, newName) : onGlobalFolderUpdate(folder.id, newName)}
                          isDroppable={true}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder.id)}
                        >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-glass">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Borrar carpeta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esto no borrará las recetas. Las recetas de esta carpeta se quedarán sin carpeta. ¿Estás seguro?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => activeTab === 'user-recipes' ? onFolderDelete(folder.id) : onGlobalFolderDelete(folder.id)}>Sí, borrar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </FolderButton>
                      ))}
                      {(activeTab === 'user-recipes' || (activeTab === 'nutriplanner-recipes' && isAdmin)) && (
                        <NewFolderPopover onFolderCreate={activeTab === 'user-recipes' ? onFolderCreate : onGlobalFolderCreate} />
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <div className="lg:col-span-4 lg:pl-4 h-full">
                  {activeTab === 'user-recipes' && (
                    <RecipeList 
                      recipes={recipesInSelectedFolder}
                      onRecipeClick={(recipe) => onRecipeAction('view', recipe, false)}
                      onAddToPlanClick={onAddToPlan}
                      isDraggable={true}
                    />
                  )}
                  {activeTab === 'nutriplanner-recipes' && (
                    <RecipeList 
                      recipes={recipesInSelectedGlobalFolder}
                      onRecipeClick={(recipe) => onRecipeAction('view', recipe, true)}
                      onCopyClick={onCopyRecipe}
                      onAddToPlanClick={onAddToPlan}
                      isDraggable={isAdmin} // Only admins can drag global recipes
                      isNutriPlanner
                    />
                  )}
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      <IngredientsDialog 
        isOpen={isIngredientsOpen}
        onClose={() => setIsIngredientsOpen(false)}
      />
    </>
  );
}
