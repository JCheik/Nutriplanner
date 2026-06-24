'use client';

import { useState, useMemo, useRef, useEffect, type DragEvent, type KeyboardEvent } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Recipe, SortCriteria, Folder, GlobalFolder } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipeCard } from './recipe-card';
import { BookHeart, PlusCircle, Search, ArrowUpDown, Copy, Database, Folder as FolderIcon, Plus, Trash2, Folders, Edit, Check, LayoutGrid, List, Sparkles, Camera, Link2 } from 'lucide-react';
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
import { cn, normalizeText } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { useUser } from '@/firebase';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface RecipeLibraryProps {
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  folders: Folder[];
  globalFolders: GlobalFolder[];
  onRecipeAction: (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => void;
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
  onAiChatOpen: () => void;
  onEmptyFridgeOpen?: () => void;
  onRecipeImportOpen?: () => void;
  isMobile?: boolean;
  initialViewMode?: 'grid' | 'list';
  onAiRecipeGenerated?: (recipe: Omit<Recipe, 'id'>) => void;
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

function FolderButton({
  name,
  icon: Icon,
  onClick,
  children,
  onUpdate,
  isSelected,
  isEditing,
  onSetEditing,
  tempName,
  onSetTempName,
  isDroppable,
  onDragOver,
  onDragLeave,
  onDrop,
  count,
}: {
  name: string;
  icon: React.ElementType;
  onClick: () => void;
  children?: React.ReactNode;
  onUpdate?: (name: string) => void;
  isSelected: boolean;
  isEditing: boolean;
  onSetEditing: (isEditing: boolean) => void;
  tempName: string;
  onSetTempName: (name: string) => void;
  isDroppable: boolean;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
  count?: number;
}) {

  const handleUpdate = () => {
    if (tempName.trim() && tempName !== name && onUpdate) {
      onUpdate(tempName.trim());
    }
    onSetEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') onSetEditing(false);
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
                onChange={e => onSetTempName(e.target.value)}
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
              "w-full justify-start text-left flex-1 h-9 pr-1",
              isSelected && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1">{name}</span>
            {count !== undefined && count > 0 && (
              <span className={cn(
                "ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                isSelected
                  ? "bg-primary/20 text-primary-foreground/80"
                  : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </Button>
        )}

        {!isEditing && children && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center">
            {onUpdate && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onSetEditing(true); onSetTempName(name); }}><Edit className="h-4 w-4"/></Button>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}


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

function getColumnCount(width: number): number {
  if (width < 640) return 2;
  if (width < 768) return 2;
  if (width < 1024) return 3;
  if (width < 1280) return 4;
  return 5;
}

function RecipeList({ recipes, onRecipeClick, onCopyClick, onAddToPlanClick, isDraggable, isNutriPlanner = false, isMobile, viewMode }: { recipes: Recipe[], onRecipeClick: (recipe: Recipe, isNutriPlanner?: boolean) => void, onCopyClick?: (recipe: Recipe) => void, onAddToPlanClick?: (recipe: Recipe) => void, isDraggable: boolean, isNutriPlanner?: boolean, isMobile: boolean, viewMode: 'grid' | 'list' }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      setColumnCount(getColumnCount(entries[0].contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cols = viewMode === 'grid' ? columnCount : 1;

  // Group recipes into rows for the virtualizer
  const rows = useMemo(() => {
    const result: Recipe[][] = [];
    for (let i = 0; i < recipes.length; i += cols) {
      result.push(recipes.slice(i, i + cols));
    }
    return result;
  }, [recipes, cols]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => viewMode === 'grid' ? 220 : 88,
    overscan: 3,
    measureElement: el => el.getBoundingClientRect().height,
  });

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg h-[250px]">
        <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="font-semibold">No se encontraron recetas</p>
        <p className="text-sm text-muted-foreground">Prueba a cambiar el filtro o crea una nueva receta.</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto pr-1">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowRecipes = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
            >
              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '12px', paddingBottom: '12px' }}>
                  {rowRecipes.map(recipe => (
                    <div key={recipe.id} className="group aspect-square relative">
                      <RecipeCard
                        recipe={recipe}
                        isDraggable={isDraggable && !isMobile}
                        onClick={() => onRecipeClick(recipe, isNutriPlanner)}
                      />
                      {onCopyClick && (
                        <Button variant="ghost" size="icon"
                          onClick={(e) => { e.stopPropagation(); onCopyClick(recipe); }}
                          className="absolute top-1 right-1 z-10 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 hover:bg-background/80"
                          aria-label="Copiar a Mis Recetas"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {onAddToPlanClick && isMobile && (
                        <Button onClick={(e) => { e.stopPropagation(); onAddToPlanClick(recipe); }}
                          className="absolute bottom-2 right-2 z-10 h-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-3">
                  {rowRecipes.map(recipe => (
                    <div key={recipe.id} className="group relative">
                      <RecipeCard
                        recipe={recipe}
                        isDraggable={isDraggable && !isMobile}
                        isListView
                        onClick={() => onRecipeClick(recipe, isNutriPlanner)}
                      />
                      {onCopyClick && (
                        <Button variant="ghost" size="icon"
                          onClick={(e) => { e.stopPropagation(); onCopyClick(recipe); }}
                          className="absolute top-1/2 -translate-y-1/2 right-2 z-10 h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 hover:bg-background/80"
                          aria-label="Copiar a Mis Recetas"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {onAddToPlanClick && isMobile && (
                        <Button onClick={(e) => { e.stopPropagation(); onAddToPlanClick(recipe); }}
                          className="absolute top-1/2 -translate-y-1/2 right-12 z-10 h-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" size="sm">
                          Añadir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FolderSection = ({
  folders,
  globalFolders,
  activeTab,
  isAdmin,
  selectedFolderId,
  setSelectedFolderId,
  editingFolderId,
  setEditingFolderId,
  editingFolderName,
  setEditingFolderName,
  onFolderUpdate,
  onGlobalFolderUpdate,
  onFolderDelete,
  onGlobalFolderDelete,
  onFolderCreate,
  onGlobalFolderCreate,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  sourceRecipes,
}: {
  folders: Folder[];
  globalFolders: GlobalFolder[];
  activeTab: string;
  isAdmin: boolean;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
  editingFolderName: string;
  setEditingFolderName: (name: string) => void;
  onFolderUpdate: (id: string, name: string) => void;
  onGlobalFolderUpdate: (id: string, name: string) => void;
  onFolderDelete: (id: string) => void;
  onGlobalFolderDelete: (id: string) => void;
  onFolderCreate: (name: string) => void;
  onGlobalFolderCreate: (name: string) => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: DragEvent<HTMLDivElement>, folderId: string | null) => void;
  sourceRecipes: Recipe[];
}) => {
  const currentFolders = activeTab === 'user-recipes' ? folders : globalFolders;

  // Count recipes per folder for badges
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const recipe of sourceRecipes) {
      const key = recipe.folderId ?? '__none__';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [sourceRecipes]);

  const totalCount = sourceRecipes.length;
  const noneCount = folderCounts['__none__'] ?? 0;

  return (
    <div className="space-y-1 pr-2">
      <FolderButton
        name={activeTab === 'user-recipes' ? "Todas mis Recetas" : "Todas"}
        icon={Folders}
        onClick={() => setSelectedFolderId('all')}
        isSelected={selectedFolderId === 'all'}
        isEditing={false} onSetEditing={() => { }} tempName="" onSetTempName={() => { }}
        isDroppable={false}
        count={totalCount}
      />
      <FolderButton
        name="Sin Carpeta"
        icon={FolderIcon}
        onClick={() => setSelectedFolderId(null)}
        isSelected={selectedFolderId === null}
        isEditing={false} onSetEditing={() => { }} tempName="" onSetTempName={() => { }}
        isDroppable={true}
        onDragOver={(e) => handleDragOver(e)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
        count={noneCount}
      />
      {currentFolders.map((folder: Folder | GlobalFolder) => (
        <FolderButton
          key={folder.id}
          name={folder.name}
          icon={FolderIcon}
          onClick={() => setSelectedFolderId(folder.id)}
          isSelected={selectedFolderId === folder.id}
          isEditing={editingFolderId === folder.id}
          onSetEditing={(isEditing: boolean) => setEditingFolderId(isEditing ? folder.id : null)}
          tempName={editingFolderName}
          onSetTempName={setEditingFolderName}
          onUpdate={(newName: string) => activeTab === 'user-recipes' ? onFolderUpdate(folder.id, newName) : onGlobalFolderUpdate(folder.id, newName)}
          isDroppable={true}
          onDragOver={(e) => handleDragOver(e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          count={folderCounts[folder.id] ?? 0}
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
  )
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
  onAiChatOpen,
  onEmptyFridgeOpen,
  onRecipeImportOpen,
  isMobile = false,
  initialViewMode = 'grid',
}: RecipeLibraryProps) {
  const { isAdmin } = useUser();
  
  const [activeTab, setActiveTab] = useState('user-recipes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const [filterQuery, setFilterQuery] = useState('');
  const [activePillFilters, setActivePillFilters] = useState<string[]>([]);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);

  const togglePillFilter = (filter: string) => {
    setActivePillFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const recipesInSelectedFolder = useMemo(() => {
    const sourceRecipes = activeTab === 'user-recipes' ? userRecipes : nutriplannerRecipes;
    if (selectedFolderId === 'all') return sourceRecipes;
    if (selectedFolderId === null) return sourceRecipes.filter(r => !r.folderId);
    return sourceRecipes.filter(recipe => recipe.folderId === selectedFolderId);
  }, [userRecipes, nutriplannerRecipes, selectedFolderId, activeTab]);

  const filteredAndSortedRecipes = useMemo(() => {
    return (recipesInSelectedFolder || []).filter(recipe => {
      // 1. Text Search Filter
      const normalizedQuery = normalizeText(filterQuery);
      let textMatch = true;
      if (normalizedQuery) {
          const nameMatch = normalizeText(recipe.name).includes(normalizedQuery);
          const ingredientMatch = (recipe.ingredients || []).some(ing => normalizeText(ing.name).includes(normalizedQuery));
          textMatch = nameMatch || ingredientMatch;
      }

      // 2. Pill Filters
      let pillMatch = true;
      if (activePillFilters.length > 0) {
        if (activePillFilters.includes('Alta en Proteína') && recipe.protein < 30) pillMatch = false;
        if (activePillFilters.includes('Baja en Carbohidratos') && recipe.carbs > 20) pillMatch = false;
        if (activePillFilters.includes('Baja en Calorías') && recipe.calories > 400) pillMatch = false;
        if (activePillFilters.includes('Pocos Ingredientes') && (recipe.ingredients?.length || 0) > 5) pillMatch = false;
      }

      return textMatch && pillMatch;
    }).sort((a, b) => {
      const [key, order] = sortCriteria.split('-') as [keyof Recipe, 'asc' | 'desc'];
      let valA = a[key];
      let valB = b[key];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = normalizeText(valA);
        valB = normalizeText(valB);
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filterQuery, activePillFilters, sortCriteria, recipesInSelectedFolder]);


  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedFolderId('all');
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
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
  
  const folderProps = {
      folders,
      globalFolders,
      activeTab,
      isAdmin,
      selectedFolderId,
      setSelectedFolderId,
      editingFolderId,
      setEditingFolderId,
      editingFolderName,
      setEditingFolderName,
      onFolderUpdate,
      onGlobalFolderUpdate,
      onFolderDelete,
      onGlobalFolderDelete,
      onFolderCreate,
      onGlobalFolderCreate,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      sourceRecipes: activeTab === 'user-recipes' ? userRecipes : nutriplannerRecipes,
  };

  return (
    <>
      <Card className={cn("flex flex-col bg-glass", isMobile ? 'h-full border-0 shadow-none bg-transparent' : 'h-[500px]')}>
        <CardHeader className={cn(isMobile && "p-0 mb-2")}>
          <div className="flex justify-between items-start gap-4">
             {!isMobile && (
              <div>
                <div className="flex items-center gap-3">
                  <BookHeart className="h-6 w-6 text-primary" />
                  <CardTitle>Biblioteca de Recetas</CardTitle>
                </div>
                <CardDescription>Tu colección de recetas y las sugerencias de NutriPlanner.</CardDescription>
              </div>
            )}
             <div className="flex items-center gap-2">
                {activeTab === 'user-recipes' && !isMobile && (
                  <>
                    <Button variant="outline" onClick={onRecipeImportOpen} data-tour="recipe-import">
                      <Link2 className="mr-2 h-4 w-4" />
                      Importar URL
                    </Button>
                    <Button variant="outline" onClick={onEmptyFridgeOpen} data-tour="fridge-scanner">
                      <Camera className="mr-2 h-4 w-4" />
                      Escanear Nevera
                    </Button>
                    <Button variant="outline" onClick={onAiChatOpen} data-tour="ai-assistant">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Asistente IA
                    </Button>
                    <Button onClick={() => onRecipeAction('create')}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nueva Receta
                    </Button>
                  </>
                )}
              </div>
          </div>
        </CardHeader>
        <CardContent className={cn("flex-1 flex flex-col min-h-0", isMobile && "p-0")}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
            <div className={cn("flex justify-between items-center border-b", isMobile ? "pr-0" : "pr-1")}>
              <TabsList className={cn(isMobile && "flex-1")}>
                <TabsTrigger value="user-recipes" className={cn(isMobile && "flex-1")}>Mis Recetas</TabsTrigger>
                <TabsTrigger value="nutriplanner-recipes" className={cn(isMobile && "flex-1")}>NutriPlanner</TabsTrigger>
              </TabsList>
            </div>
            
            {isMobile && (
                 <Accordion type="single" collapsible className="w-full mt-2">
                    <AccordionItem value="folders">
                        <AccordionTrigger>
                            <h3 className="font-semibold text-sm">{activeTab === 'user-recipes' ? 'Mis Carpetas' : 'Carpetas Globales'}</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                           <FolderSection {...folderProps} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            <div className={cn("flex-1 grid lg:grid-cols-5 mt-2 overflow-hidden gap-4", isMobile && "grid-cols-1")}>
              {!isMobile && (
                <div className="col-span-1 border-r pr-2">
                    <h3 className="font-semibold text-sm mb-2 px-2">{activeTab === 'user-recipes' ? 'Mis Carpetas' : 'Carpetas Globales'}</h3>
                  <ScrollArea className="h-full">
                    <FolderSection {...folderProps} />
                  </ScrollArea>
                </div>
              )}
              <div className={cn("h-full flex flex-col min-h-0", isMobile ? "col-span-full" : "lg:col-span-4")}>
                 <div className="flex flex-col gap-2 p-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Filtrar por nombre o ingrediente..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="shrink-0 flex-1">
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
                      <div className="p-1 border bg-muted rounded-md flex">
                          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-8 w-8">
                              <LayoutGrid className="h-4 w-4" />
                          </Button>
                          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-8 w-8">
                              <List className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pill Filters Container */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['Alta en Proteína', 'Baja en Carbohidratos', 'Baja en Calorías', 'Pocos Ingredientes'].map(filter => (
                      <Button
                        key={filter}
                        variant={activePillFilters.includes(filter) ? 'default' : 'secondary'}
                        size="sm"
                        className="rounded-full shrink-0 h-7 text-xs"
                        onClick={() => togglePillFilter(filter)}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>

                </div>
                <div className="flex-1 mt-2 min-h-0">
                  {(() => {
                    const hasActiveFilters = !!filterQuery || activePillFilters.length > 0;
                    const folderIsEmpty = recipesInSelectedFolder.length === 0;
                    const isFolderView = selectedFolderId !== 'all';
                    const isUserTab = activeTab === 'user-recipes';

                    if (folderIsEmpty && !hasActiveFilters && isFolderView) {
                      // Genuine empty folder — show CTA
                      return (
                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg h-[250px] gap-4">
                          <FolderIcon className="h-12 w-12 text-muted-foreground/30" />
                          <div>
                            <p className="font-semibold text-base">Esta carpeta está vacía</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedFolderId === null
                                ? 'Todas tus recetas están organizadas en carpetas.'
                                : 'Añade recetas arrastrándolas aquí o crea una nueva.'}
                            </p>
                          </div>
                          {isUserTab && selectedFolderId !== null && (
                            <div className="flex gap-2 flex-wrap justify-center">
                              <Button size="sm" onClick={() => onRecipeAction('create')}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear receta
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setSelectedFolderId('all')}>
                                <Folders className="mr-2 h-4 w-4" />
                                Ver todas las recetas
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <RecipeList
                        recipes={filteredAndSortedRecipes}
                        onRecipeClick={(recipe, isNutri) => onRecipeAction('view', recipe, isNutri)}
                        onCopyClick={onCopyRecipe}
                        onAddToPlanClick={onAddToPlan}
                        isDraggable={activeTab === 'user-recipes' || (activeTab === 'nutriplanner-recipes' && isAdmin)}
                        isNutriPlanner={activeTab === 'nutriplanner-recipes'}
                        isMobile={isMobile}
                        viewMode={viewMode}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
