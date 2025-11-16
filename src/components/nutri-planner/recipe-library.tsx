'use client';

import type { Recipe, SortCriteria } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipeCard } from './recipe-card';
import { BookHeart, PlusCircle, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecipeLibraryProps {
  recipes: Recipe[];
  onRecipeAction: (action: 'view' | 'create', recipe?: Recipe) => void;
  filterQuery: string;
  onFilterChange: (query: string) => void;
  sortCriteria: SortCriteria;
  onSortChange: (criteria: SortCriteria) => void;
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

export function RecipeLibrary({ 
    recipes, 
    onRecipeAction, 
    filterQuery, 
    onFilterChange,
    sortCriteria,
    onSortChange
}: RecipeLibraryProps) {
  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <BookHeart className="h-6 w-6 text-primary" />
              <CardTitle>Biblioteca de Recetas</CardTitle>
            </div>
            <CardDescription>Tu colección de recetas guardadas.</CardDescription>
          </div>
          <Button onClick={() => onRecipeAction('create')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Receta
          </Button>
        </div>
        <div className="flex gap-2 mt-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filtrar por nombre o ingrediente..."
                    value={filterQuery}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="pl-10"
                />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Ordenar por
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={sortCriteria} onValueChange={(value) => onSortChange(value as SortCriteria)}>
                        {sortOptions.map((option) => (
                            <DropdownMenuRadioItem key={option.value} value={option.value}>
                                {option.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-3 pr-4">
            {recipes.length > 0 ? (
              recipes.map(recipe => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  isDraggable 
                  isListView
                  onClick={() => onRecipeAction('view', recipe)}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full">
                  <p className="font-semibold">No se encontraron recetas</p>
                  <p className="text-sm text-muted-foreground">Prueba a cambiar el filtro o crea una nueva receta.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
