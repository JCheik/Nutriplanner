'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Recipe, SortCriteria, DietTag } from '@/lib/types';
import { DIET_TAGS } from '@/lib/constants';
import {
  type SmartCategory,
  SMART_CATEGORY_LABELS,
  groupRecipesByCategory,
} from '@/lib/recipe-categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipeCard } from './recipe-card';
import { BookHeart, PlusCircle, Search, ArrowUpDown, Copy, Plus, Folders, Edit, LayoutGrid, List, Sparkles, Camera, Link2, MoreVertical, Wand2, Target, ShoppingCart, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, normalizeText } from '@/lib/utils';
import { useUser } from '@/firebase';
import { FeatureHint } from './feature-hint';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface RecipeLibraryProps {
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  onRecipeAction: (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => void;
  onCopyRecipe: (recipe: Recipe) => void;
  onAddToPlan: (recipe: Recipe) => void;
  onAssistantOpen: () => void;
  onEmptyFridgeOpen?: () => void;
  onRecipeImportOpen?: () => void;
  onGoalsOpen?: () => void;
  onShoppingListOpen?: () => void;
  onHistoryOpen?: () => void;
  isMobile?: boolean;
  initialViewMode?: 'grid' | 'list';
  dietPreference?: DietTag[];
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

function CategoryButton({
  name,
  icon: Icon,
  onClick,
  isSelected,
  count,
}: {
  name: string;
  icon: React.ElementType;
  onClick: () => void;
  isSelected: boolean;
  count?: number;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start text-left h-9 pr-1",
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
  );
}

function getColumnCount(width: number): number {
  if (width < 640) return 2;
  if (width < 768) return 2;
  if (width < 1024) return 3;
  if (width < 1280) return 4;
  return 5;
}

function RecipeList({ recipes, onRecipeClick, onCopyClick, onAddToPlanClick, onEditClick, isDraggable, isNutriPlanner = false, isMobile, viewMode }: { recipes: Recipe[], onRecipeClick: (recipe: Recipe, isNutriPlanner?: boolean) => void, onCopyClick?: (recipe: Recipe) => void, onAddToPlanClick?: (recipe: Recipe) => void, onEditClick?: (recipe: Recipe) => void, isDraggable: boolean, isNutriPlanner?: boolean, isMobile: boolean, viewMode: 'grid' | 'list' }) {
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
    estimateSize: () => viewMode === 'grid' ? (isMobile ? 232 : 220) : (isMobile ? 104 : 88),
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
                    <div key={recipe.id} className={cn("group relative", !isMobile && "aspect-square")}>
                      <RecipeCard
                        recipe={recipe}
                        isDraggable={isDraggable && !isMobile}
                        isMobile={isMobile}
                        onClick={() => onRecipeClick(recipe, isNutriPlanner)}
                      />
                      {/* Desktop hover action bar */}
                      <div className="absolute inset-x-0 bottom-0 hidden sm:flex justify-center gap-1 px-2 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-md z-10">
                        {onAddToPlanClick && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" title="Añadir al plan"
                            onClick={(e) => { e.stopPropagation(); onAddToPlanClick(recipe); }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onCopyClick && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" title="Copiar receta"
                            onClick={(e) => { e.stopPropagation(); onCopyClick(recipe); }}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onEditClick && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" title="Editar"
                            onClick={(e) => { e.stopPropagation(); onEditClick(recipe); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {/* Mobile kebab */}
                      <div className="absolute top-1 right-1 z-10 sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-7 w-7 bg-background/70"
                              onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-glass">
                            {onAddToPlanClick && <DropdownMenuItem onClick={() => onAddToPlanClick(recipe)}><Plus className="mr-2 h-4 w-4" />Añadir al plan</DropdownMenuItem>}
                            {onCopyClick && <DropdownMenuItem onClick={() => onCopyClick(recipe)}><Copy className="mr-2 h-4 w-4" />Copiar receta</DropdownMenuItem>}
                            {onEditClick && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onEditClick(recipe)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem></>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
                      {/* Desktop hover actions — list view */}
                      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-10 hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onAddToPlanClick && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" title="Añadir al plan"
                            onClick={(e) => { e.stopPropagation(); onAddToPlanClick(recipe); }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onCopyClick && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" title="Copiar receta"
                            onClick={(e) => { e.stopPropagation(); onCopyClick(recipe); }}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onEditClick && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" title="Editar"
                            onClick={(e) => { e.stopPropagation(); onEditClick(recipe); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {/* Mobile kebab — list view */}
                      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-10 sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-glass">
                            {onAddToPlanClick && <DropdownMenuItem onClick={() => onAddToPlanClick(recipe)}><Plus className="mr-2 h-4 w-4" />Añadir al plan</DropdownMenuItem>}
                            {onCopyClick && <DropdownMenuItem onClick={() => onCopyClick(recipe)}><Copy className="mr-2 h-4 w-4" />Copiar receta</DropdownMenuItem>}
                            {onEditClick && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onEditClick(recipe)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem></>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

const CategorySection = ({
  totalCount,
  selectedCategory,
  onSelectCategory,
  smartCategories,
  smartCategoryLabels,
}: {
  totalCount: number;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  smartCategories: Record<string, Recipe[]>;
  smartCategoryLabels: Record<string, string>;
}) => {
  const smartCatEntries = Object.entries(smartCategories).filter(([, rs]) => rs.length > 0);

  return (
    <div className="space-y-1 pr-2">
      <CategoryButton
        name="Todas las recetas"
        icon={Folders}
        onClick={() => onSelectCategory(null)}
        isSelected={selectedCategory === null}
        count={totalCount}
      />
      {smartCatEntries.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 pt-2 pb-0.5">
            Categorías
          </p>
          {smartCatEntries.map(([cat, rs]) => (
            <CategoryButton
              key={`smart-${cat}`}
              name={smartCategoryLabels[cat] ?? cat}
              icon={Sparkles}
              onClick={() => onSelectCategory(cat)}
              isSelected={selectedCategory === cat}
              count={rs.length}
            />
          ))}
        </>
      )}
    </div>
  )
}

export function RecipeLibrary({
  userRecipes,
  nutriplannerRecipes,
  onRecipeAction,
  onCopyRecipe,
  onAddToPlan,
  onAssistantOpen,
  onEmptyFridgeOpen,
  onRecipeImportOpen,
  onGoalsOpen,
  onShoppingListOpen,
  onHistoryOpen,
  isMobile = false,
  initialViewMode = 'grid',
  dietPreference = [],
}: RecipeLibraryProps) {
  const { isAdmin } = useUser();

  const [activeTab, setActiveTab] = useState('user-recipes');
  // null = "Todas las recetas"; otherwise a smart-category key.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  const [filterQuery, setFilterQuery] = useState('');
  const [activePillFilters, setActivePillFilters] = useState<string[]>([]);

  // Diet filter defaults to the user's saved preference, but the user can override
  // it. Once they touch it, we stop syncing from the (async-loading) preference.
  const [activeDietFilters, setActiveDietFilters] = useState<DietTag[]>(dietPreference);
  const dietTouched = useRef(false);
  // Sync by VALUE, not reference: callers may pass a fresh array literal (e.g. the
  // default `[]`) on every render. Depending on the reference here caused an
  // infinite setState→re-render loop that froze the whole recipes page. Keying the
  // effect on the serialized contents makes it run only when the diet actually
  // changes, and the functional update bails out if nothing differs.
  const dietPreferenceKey = dietPreference.join(',');
  useEffect(() => {
    if (dietTouched.current) return;
    setActiveDietFilters(prev =>
      prev.length === dietPreference.length && prev.every((d, i) => d === dietPreference[i])
        ? prev
        : dietPreference
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietPreferenceKey]);
  const toggleDietFilter = (diet: DietTag) => {
    dietTouched.current = true;
    setActiveDietFilters(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  // Read persisted prefs from localStorage on mount (runs only in browser).
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>(() => {
    if (typeof window === 'undefined') return 'name-asc';
    try {
      const saved = JSON.parse(localStorage.getItem('nutriplanner_prefs') ?? '{}');
      return (saved.sortCriteria as SortCriteria) ?? 'name-asc';
    } catch { return 'name-asc'; }
  });
  // Persist the view mode separately per device: phones default to (and remember)
  // list view, while the desktop grid preference is kept under its own key. Sharing
  // one key meant a desktop "grid" choice forced grid onto mobile, where the cards
  // are cramped and list reads better.
  const viewModeKey = isMobile ? 'viewModeMobile' : 'viewMode';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return initialViewMode;
    try {
      const saved = JSON.parse(localStorage.getItem('nutriplanner_prefs') ?? '{}');
      return (saved[viewModeKey] as 'grid' | 'list') ?? initialViewMode;
    } catch { return initialViewMode; }
  });

  // Persist prefs whenever they change.
  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem('nutriplanner_prefs') ?? '{}');
      localStorage.setItem('nutriplanner_prefs', JSON.stringify({ ...current, sortCriteria }));
    } catch { /* localStorage unavailable */ }
  }, [sortCriteria]);

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem('nutriplanner_prefs') ?? '{}');
      localStorage.setItem('nutriplanner_prefs', JSON.stringify({ ...current, [viewModeKey]: viewMode }));
    } catch { /* localStorage unavailable */ }
  }, [viewMode, viewModeKey]);

  const togglePillFilter = (filter: string) => {
    setActivePillFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Smart categories — prefers the recipe's explicit category and falls back to
  // keyword classification. Shared with the slot selection dialog via the helper.
  const smartCategories = useMemo<Record<SmartCategory, Recipe[]>>(() => {
    const sourceRecipes = activeTab === 'user-recipes' ? userRecipes : nutriplannerRecipes;
    return groupRecipesByCategory(sourceRecipes);
  }, [activeTab, userRecipes, nutriplannerRecipes]);

  const recipesInSelectedCategory = useMemo(() => {
    const sourceRecipes = activeTab === 'user-recipes' ? userRecipes : nutriplannerRecipes;
    if (selectedCategory) return smartCategories[selectedCategory as SmartCategory] ?? [];
    return sourceRecipes;
  }, [userRecipes, nutriplannerRecipes, selectedCategory, smartCategories, activeTab]);

  const filteredAndSortedRecipes = useMemo(() => {
    return (recipesInSelectedCategory || []).filter(recipe => {
      const normalizedQuery = normalizeText(filterQuery);
      let textMatch = true;
      if (normalizedQuery) {
          const nameMatch = normalizeText(recipe.name).includes(normalizedQuery);
          const ingredientMatch = (recipe.ingredients || []).some(ing => normalizeText(ing.name).includes(normalizedQuery));
          textMatch = nameMatch || ingredientMatch;
      }

      let pillMatch = true;
      if (activePillFilters.length > 0) {
        if (activePillFilters.includes('Alta en Proteína') && recipe.protein < 30) pillMatch = false;
        if (activePillFilters.includes('Baja en Carbohidratos') && recipe.carbs > 20) pillMatch = false;
        if (activePillFilters.includes('Baja en Calorías') && recipe.calories > 400) pillMatch = false;
        if (activePillFilters.includes('Pocos Ingredientes') && (recipe.ingredients?.length || 0) > 5) pillMatch = false;
      }

      // Diet filter: a recipe passes if no diet is selected, the recipe has no diet
      // tags (treated as compatible/comodín), or its tags intersect the selection.
      let dietMatch = true;
      if (activeDietFilters.length > 0) {
        const tags = recipe.dietTags ?? [];
        dietMatch = tags.length === 0 || activeDietFilters.some(d => tags.includes(d));
      }

      return textMatch && pillMatch && dietMatch;
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
  }, [filterQuery, activePillFilters, activeDietFilters, sortCriteria, recipesInSelectedCategory]);

  // Cross-tab search: when query is active, search both collections simultaneously.
  const crossSearchResults = useMemo(() => {
    const q = normalizeText(filterQuery);
    if (!q) return null;

    const matchRecipe = (r: Recipe) => {
      const nameMatch = normalizeText(r.name).includes(q);
      const ingMatch = (r.ingredients ?? []).some(i => normalizeText(i.name).includes(q));
      return nameMatch || ingMatch;
    };

    const sortFn = (a: Recipe, b: Recipe) => {
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
    };

    return {
      user: userRecipes.filter(matchRecipe).sort(sortFn),
      nutriplanner: nutriplannerRecipes.filter(matchRecipe).sort(sortFn),
    };
  }, [filterQuery, sortCriteria, userRecipes, nutriplannerRecipes]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedCategory(null);
  };

  const sourceRecipes = activeTab === 'user-recipes' ? userRecipes : nutriplannerRecipes;

  const categoryProps = {
      totalCount: sourceRecipes.length,
      selectedCategory,
      onSelectCategory: setSelectedCategory,
      smartCategories,
      smartCategoryLabels: SMART_CATEGORY_LABELS,
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
                <CardDescription>Tu colección de recetas y el recetario base de Nutrilp.</CardDescription>
              </div>
            )}
             <div className="flex items-center gap-2">
                {!isMobile && onGoalsOpen && (
                  <Button variant="outline" onClick={onGoalsOpen} data-tour="goals">
                    <Target className="mr-2 h-4 w-4" />
                    Objetivos
                  </Button>
                )}
                {!isMobile && onShoppingListOpen && (
                  <Button variant="outline" onClick={onShoppingListOpen} data-tour="shopping-list">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Compra
                  </Button>
                )}
                {!isMobile && onHistoryOpen && (
                  <Button variant="outline" onClick={onHistoryOpen} data-tour="week-history">
                    <History className="mr-2 h-4 w-4" />
                    Historial
                  </Button>
                )}
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
                    <FeatureHint
                      id="ai-assistant"
                      title="Asistente con IA"
                      text="Pídele que cree recetas, que rellene tu plan o resuelve dudas de nutrición. También puedes hablarle por voz."
                      side="bottom"
                      align="end"
                    >
                      <Button variant="outline" onClick={onAssistantOpen} data-tour="ai-assistant">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Asistente
                      </Button>
                    </FeatureHint>
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
                <TabsTrigger value="nutriplanner-recipes" className={cn(isMobile && "flex-1")}>Recetas Nutrilp</TabsTrigger>
              </TabsList>
              {isMobile && (
                <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-2 shrink-0">
                      <Folders className="mr-1 h-4 w-4" />
                      Categorías
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] bg-glass">
                    <SheetHeader>
                      <SheetTitle>Categorías</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full pt-4 pb-8">
                      <CategorySection {...{ ...categoryProps, onSelectCategory: (cat: string | null) => { setSelectedCategory(cat); setCategorySheetOpen(false); } }} />
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            <div className={cn("flex-1 grid lg:grid-cols-5 mt-2 overflow-hidden gap-4", isMobile && "grid-cols-1")}>
              {!isMobile && (
                <div className="col-span-1 border-r pr-2">
                    <h3 className="font-semibold text-sm mb-2 px-2">Categorías</h3>
                  <ScrollArea className="h-full">
                    <CategorySection {...categoryProps} />
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

                  {/* Diet Filters */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Dieta</span>
                    {DIET_TAGS.map(diet => (
                      <Button
                        key={diet.value}
                        variant={activeDietFilters.includes(diet.value) ? 'default' : 'secondary'}
                        size="sm"
                        className="rounded-full shrink-0 h-7 text-xs"
                        onClick={() => toggleDietFilter(diet.value)}
                      >
                        {diet.label}
                      </Button>
                    ))}
                  </div>

                </div>
                <div className="flex-1 mt-2 min-h-0 overflow-auto">
                  {crossSearchResults ? (
                    /* Cross-tab search view — show both collections grouped */
                    <div className="flex flex-col gap-4 pr-1">
                      {crossSearchResults.user.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                            Mis Recetas ({crossSearchResults.user.length})
                          </p>
                          <RecipeList
                            recipes={crossSearchResults.user}
                            onRecipeClick={(recipe) => onRecipeAction('view', recipe, false)}
                            onCopyClick={onCopyRecipe}
                            onAddToPlanClick={onAddToPlan}
                            onEditClick={(recipe) => onRecipeAction('edit', recipe, false)}
                            isDraggable={false}
                            isNutriPlanner={false}
                            isMobile={isMobile}
                            viewMode={viewMode}
                          />
                        </div>
                      )}
                      {crossSearchResults.nutriplanner.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                            Recetas Nutrilp ({crossSearchResults.nutriplanner.length})
                          </p>
                          <RecipeList
                            recipes={crossSearchResults.nutriplanner}
                            onRecipeClick={(recipe) => onRecipeAction('view', recipe, true)}
                            onCopyClick={onCopyRecipe}
                            onAddToPlanClick={onAddToPlan}
                            onEditClick={(recipe) => onRecipeAction('edit', recipe, true)}
                            isDraggable={false}
                            isNutriPlanner={true}
                            isMobile={isMobile}
                            viewMode={viewMode}
                          />
                        </div>
                      )}
                      {crossSearchResults.user.length === 0 && crossSearchResults.nutriplanner.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg h-[250px]">
                          <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="font-semibold">No se encontraron recetas</p>
                          <p className="text-sm text-muted-foreground">Prueba con otro término.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const hasActiveFilters = activePillFilters.length > 0;
                      const categoryIsEmpty = recipesInSelectedCategory.length === 0;
                      const isCategoryView = selectedCategory !== null;
                      const isUserTab = activeTab === 'user-recipes';

                      if (categoryIsEmpty && !hasActiveFilters && isCategoryView) {
                        // Selected category has no recipes — show CTA
                        return (
                          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg h-[250px] gap-4">
                            <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                            <div>
                              <p className="font-semibold text-base">No hay recetas en esta categoría</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Crea una receta y asígnale esta categoría, o revisa todas tus recetas.
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                              {isUserTab && (
                                <Button size="sm" onClick={() => onRecipeAction('create')}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Crear receta
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setSelectedCategory(null)}>
                                <Folders className="mr-2 h-4 w-4" />
                                Ver todas las recetas
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <RecipeList
                          recipes={filteredAndSortedRecipes}
                          onRecipeClick={(recipe, isNutri) => onRecipeAction('view', recipe, isNutri)}
                          onCopyClick={onCopyRecipe}
                          onAddToPlanClick={onAddToPlan}
                          onEditClick={(recipe) => onRecipeAction('edit', recipe, activeTab === 'nutriplanner-recipes')}
                          isDraggable={activeTab === 'user-recipes' || (activeTab === 'nutriplanner-recipes' && isAdmin)}
                          isNutriPlanner={activeTab === 'nutriplanner-recipes'}
                          isMobile={isMobile}
                          viewMode={viewMode}
                        />
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
