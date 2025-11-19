'use client';

import { useState } from 'react';
import type { Recipe, SortCriteria } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipeCard } from './recipe-card';
import { BookHeart, PlusCircle, Search, ArrowUpDown, Copy, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IngredientsDialog } from './ingredients-dialog';

interface RecipeListProps {
  recipes: Recipe[];
  onRecipeClick: (recipe: Recipe) => void;
  onCopyClick?: (recipe: Recipe) => void;
  isNutriPlanner?: boolean;
}

interface RecipeLibraryProps {
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  onRecipeAction: (action: 'view' | 'create', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => void;
  onCopyRecipe: (recipe: Recipe) => void;
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

function RecipeList({ recipes, onRecipeClick, onCopyClick, isNutriPlanner = false }: RecipeListProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-1">
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
            <Button variant="outline" className="shrink-0">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
        <div className={isNutriPlanner ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pr-4" : "flex flex-col gap-3 pr-4"}>
          {filteredAndSortedRecipes.length > 0 ? (
            filteredAndSortedRecipes.map(recipe => (
              <div key={recipe.id} className="group flex items-center gap-2">
                 {isNutriPlanner ? (
                   <div className="aspect-square w-full relative">
                      <RecipeCard 
                        recipe={recipe} 
                        isDraggable={false}
                        onClick={() => onRecipeClick(recipe)}
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
                        isDraggable={true}
                        isListView
                        onClick={() => onRecipeClick(recipe)}
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

export function RecipeLibrary({ 
  userRecipes, 
  nutriplannerRecipes,
  onRecipeAction,
  onCopyRecipe,
}: RecipeLibraryProps) {
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  return (
    <>
      <Card className="flex flex-col h-[500px] bg-card">
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
          <Tabs defaultValue="user-recipes" className="flex flex-col h-full">
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
            <TabsContent value="user-recipes" className="flex-1 mt-2 overflow-hidden">
              <RecipeList 
                recipes={userRecipes}
                onRecipeClick={(recipe) => onRecipeAction('view', recipe, false)}
              />
            </TabsContent>
            <TabsContent value="nutriplanner-recipes" className="flex-1 mt-2 overflow-hidden">
              <RecipeList 
                recipes={nutriplannerRecipes}
                onRecipeClick={(recipe) => onRecipeAction('view', recipe, true)}
                onCopyClick={onCopyRecipe}
                isNutriPlanner
              />
            </TabsContent>
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
