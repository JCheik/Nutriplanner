'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import type { DayPlan, Meal, Recipe, RecipeInstance, GoalMacros, DietTag } from '@/lib/types';
import { DAY_ORDER } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import {
  X, Plus, Minus, UtensilsCrossed, Mic,
  Sparkles, History, Pencil, GripVertical, LayoutGrid, CalendarDays, ChevronRight, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useRecipeState } from '@/hooks/use-recipe-state';
import type { useWeekPlanState } from '@/hooks/use-week-plan-state';

type CombinedState = ReturnType<typeof useRecipeState> & ReturnType<typeof useWeekPlanState>;

interface MobilePageContentProps extends CombinedState {
  activeGoalMacros: GoalMacros | null;
  dietPreference?: DietTag[];
  onAssistantOpen: () => void;
  onHistorialOpen?: () => void;
}

type ViewMode = 'day' | 'grid';

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Brand colors as constants to avoid Tailwind JIT purge issues
const C = {
  bg: '#F7F3EC',
  card: '#FDFCFA',
  hdrBg: 'hsl(40 25% 93%)',
  primary: '#D9521A',
  primaryLight: 'rgba(217,82,26,0.08)',
  primaryBorder: 'rgba(217,82,26,0.35)',
  brown: '#3D1F0A',
  muted: '#8C4A1F',
  beige: '#EDE9E2',
  border: '#DDD6CC',
  dimText: '#B09878',
};

const MEAL_COLOR: Record<string, string> = {
  desayuno: '#F59E0B',
  almuerzo: '#D9521A',
  merienda: '#8B9A6B',
  cena: '#6B7BB8',
  snack: '#EC4899',
  postre: '#F43F5E',
};

function mealColor(meal: Meal): string {
  const type = meal.mealTypes?.[0];
  return type ? (MEAL_COLOR[type] ?? C.border) : C.border;
}

function totalsFor(meals: Meal[]) {
  return meals.reduce(
    (acc, meal) => {
      meal.recipes.forEach(r => {
        const s = (r.servingsEaten ?? 1) / (r.servings ?? 1);
        acc.calories += r.calories * s;
        acc.protein += r.protein * s;
        acc.carbs += r.carbs * s;
        acc.fat += r.fat * s;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function todayDayIndex(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function MobilePageContent({
  currentUserRecipes,
  nutriplannerRecipes,
  currentWeekPlan,
  handleDrop,
  handleRemoveRecipeFromMeal,
  handleUpdateServingsEaten,
  handleAddMeal,
  activeGoalMacros,
  dietPreference = [],
  onAssistantOpen,
  onHistorialOpen,
}: MobilePageContentProps) {
  const todayIndex = useMemo(() => todayDayIndex(), []);
  const [view, setView] = useState<ViewMode>('day');
  const [activeDayIndex, setActiveDayIndex] = useState(todayIndex);
  const [editMode, setEditMode] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedMealDay, setSelectedMealDay] = useState<DayPlan['day'] | null>(null);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });

  const touchStartX = useRef<number | null>(null);

  const weekPlan = useMemo<DayPlan[]>(() => currentWeekPlan ?? [], [currentWeekPlan]);
  const activeDayPlan = weekPlan[activeDayIndex] ?? null;
  const activeDayName = (activeDayPlan?.day ?? DAY_ORDER[activeDayIndex]) as DayPlan['day'];
  const dayMeals = useMemo(() => activeDayPlan?.meals ?? [], [activeDayPlan]);
  const totals = useMemo(() => totalsFor(dayMeals), [dayMeals]);
  const caloriePercent = activeGoalMacros?.calories
    ? Math.min(100, (totals.calories / activeGoalMacros.calories) * 100)
    : null;

  const goToDay = (index: number) => setActiveDayIndex((index + DAY_ORDER.length) % DAY_ORDER.length);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 50) goToDay(activeDayIndex + (dx < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  const openRecipeSelector = useCallback((meal: Meal, dayName: DayPlan['day']) => {
    setSelectedMeal(meal);
    setSelectedMealDay(dayName);
    setIsRecipeSelectorOpen(true);
  }, []);

  const handleRecipeSelectionSave = (updatedRecipes: Recipe[]) => {
    if (!selectedMeal || !selectedMealDay) return;
    updatedRecipes.forEach(recipe => handleDrop(selectedMealDay, selectedMeal.id, recipe));
    setIsRecipeSelectorOpen(false);
    setSelectedMeal(null);
    setSelectedMealDay(null);
  };

  const handleDialogClose = useCallback(() => setDialogState({ open: false }), []);

  const allRecipes = useMemo(
    () => [...currentUserRecipes, ...nutriplannerRecipes],
    [currentUserRecipes, nutriplannerRecipes]
  );

  return (
    <>
      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-20 border-b border-border" style={{ background: C.hdrBg }}>
        {/* Title row + view toggle */}
        <div className="flex items-start justify-between px-4 pt-3 pb-2">
          <div>
            <h1 className="font-headline text-xl font-bold text-foreground leading-none">
              {view === 'grid' ? 'Esta semana' : activeDayIndex === todayIndex ? 'Hoy' : DAY_ORDER[activeDayIndex]}
            </h1>
            {view === 'day' && activeDayIndex === todayIndex && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{DAY_ORDER[activeDayIndex]}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {/* Día / Semana toggle */}
            <div className="flex rounded-full p-0.5" style={{ background: C.beige }}>
              <button
                onClick={() => setView('day')}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                  view === 'day' ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
                style={view === 'day' ? { background: C.primary } : {}}
              >
                <CalendarDays className="h-3 w-3" /> Día
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                  view === 'grid' ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
                style={view === 'grid' ? { background: C.primary } : {}}
              >
                <LayoutGrid className="h-3 w-3" /> Semana
              </button>
            </div>
            {/* Kcal chip */}
            {view === 'day' && totals.calories > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-primary" />
                <span className="font-bold text-sm text-primary leading-none">{Math.round(totals.calories)}</span>
                <span className="text-[10px] text-muted-foreground">
                  / {activeGoalMacros ? Math.round(activeGoalMacros.calories) : '—'} kcal
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Day strip with progress bars — day view only */}
        {view === 'day' && (
          <div className="flex items-end gap-0.5 px-4 pb-2">
            {DAY_ORDER.map((day, i) => {
              const dayKcal = totalsFor(weekPlan[i]?.meals ?? []).calories;
              const barH = activeGoalMacros?.calories && dayKcal > 0
                ? Math.max(3, Math.min(20, Math.round((dayKcal / activeGoalMacros.calories) * 20)))
                : dayKcal > 0 ? 8 : 2;
              const isActive = i === activeDayIndex;
              const isToday = i === todayIndex;
              return (
                <button key={day} onClick={() => setActiveDayIndex(i)} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end" style={{ height: 20 }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-200"
                      style={{
                        height: barH,
                        background: isActive ? C.primary : isToday ? 'rgba(217,82,26,0.5)' : 'rgba(217,82,26,0.2)',
                      }}
                    />
                  </div>
                  <span className={cn('text-[8px] font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    {DAY_LETTERS[i]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ActionChip
            icon={<Sparkles className="h-3 w-3" />}
            label="Autocompletar"
            onClick={onAssistantOpen}
            accent
          />
          <ActionChip
            icon={<History className="h-3 w-3" />}
            label="Historial"
            onClick={onHistorialOpen ?? (() => {})}
          />
          {view === 'day' && !editMode && (
            <ActionChip
              icon={<Pencil className="h-3 w-3" />}
              label="Editar"
              onClick={() => setEditMode(true)}
            />
          )}
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ background: C.primaryLight, borderColor: C.primaryBorder }}
        >
          <span className="text-sm font-medium flex items-center gap-1.5 text-primary">
            <Pencil className="h-3.5 w-3.5" /> Modo edición
          </span>
          <button
            onClick={() => setEditMode(false)}
            className="text-sm font-semibold rounded-full px-3 py-0.5 border text-primary"
            style={{ borderColor: C.primaryBorder }}
          >
            Listo
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {view === 'day' ? (
        <div
          className="px-4 pb-28 pt-4 space-y-4"
          style={{
            background: C.bg,
            backgroundImage: 'radial-gradient(circle, rgba(217,160,136,0.25) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Calorie progress card */}
          {activeGoalMacros && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, caloriePercent ?? 0)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Prot.', value: totals.protein, target: activeGoalMacros.protein },
                  { label: 'Carbs', value: totals.carbs, target: activeGoalMacros.carbs },
                  { label: 'Grasa', value: totals.fat, target: activeGoalMacros.fat },
                ].map(({ label, value, target }) => (
                  <div key={label} className="flex flex-col items-center">
                    <span className="font-bold text-sm">{Math.round(value)}g</span>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <span className="text-[9px] text-muted-foreground/60">/ {Math.round(target)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dayMeals.length > 0 ? (
            <>
              {dayMeals.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  editMode={editMode}
                  onAddRecipe={() => openRecipeSelector(meal, activeDayName)}
                  onRecipeClick={(r) => setDialogState({ open: true, mode: 'view', recipe: r as Recipe })}
                  onUpdateServings={(instanceId, n) =>
                    handleUpdateServingsEaten(activeDayName, meal.id, instanceId, n)}
                  onRemoveRecipe={(instanceId) =>
                    handleRemoveRecipeFromMeal(activeDayName, meal.id, instanceId)}
                />
              ))}
              {editMode && (
                <button
                  onClick={() => handleAddMeal(activeDayName, dayMeals.length)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-colors text-primary"
                  style={{ background: C.primaryLight, border: `0.5px dashed ${C.primaryBorder}` }}
                >
                  <Plus className="h-4 w-4" /> Añadir comida
                </button>
              )}
            </>
          ) : (
            <EmptyDay onAddMeal={() => handleAddMeal(activeDayName, 0)} />
          )}
        </div>
      ) : (
        <GridView
          weekPlan={weekPlan}
          todayIndex={todayIndex}
          onOpenDay={(dayIndex) => { setActiveDayIndex(dayIndex); setView('day'); }}
          onAddRecipe={openRecipeSelector}
          onRemoveRecipe={handleRemoveRecipeFromMeal}
        />
      )}

      {/* FAB */}
      <button
        onClick={onAssistantOpen}
        aria-label="Hablar con el asistente"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ background: C.primary, color: '#FDF8F4' }}
      >
        <Mic className="h-6 w-6" />
      </button>

      <RecipeDialog dialogState={dialogState} onClose={handleDialogClose} isMobile={true} />

      {selectedMeal && (
        <RecipeSelectionDialog
          isOpen={isRecipeSelectorOpen}
          onClose={() => { setIsRecipeSelectorOpen(false); setSelectedMeal(null); setSelectedMealDay(null); }}
          meal={selectedMeal}
          allRecipes={allRecipes}
          onSave={handleRecipeSelectionSave}
          dietPreference={dietPreference}
        />
      )}
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActionChip({
  icon, label, onClick, accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium flex-shrink-0 transition-opacity active:opacity-70"
      style={accent
        ? { background: C.primaryLight, border: `0.5px solid ${C.primaryBorder}`, color: C.primary }
        : { background: C.card, border: `0.5px solid ${C.border}`, color: C.muted }
      }
    >
      {icon} {label}
    </button>
  );
}

function MealCard({
  meal, editMode, onAddRecipe, onRecipeClick, onUpdateServings, onRemoveRecipe,
}: {
  meal: Meal;
  editMode: boolean;
  onAddRecipe: () => void;
  onRecipeClick: (r: RecipeInstance) => void;
  onUpdateServings: (instanceId: string, n: number) => void;
  onRemoveRecipe: (instanceId: string) => void;
}) {
  const mealKcal = meal.recipes.reduce(
    (sum, r) => sum + r.calories * ((r.servingsEaten ?? 1) / (r.servings ?? 1)), 0
  );
  const accent = mealColor(meal);

  return (
    <div
      className="rounded-2xl border bg-card overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: accent }}
    >
      <div className="flex items-center px-4 py-2.5 gap-3">
        {editMode && <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />}
        <span
          className="text-xs font-bold uppercase tracking-wider flex-1"
          style={{ color: C.muted, letterSpacing: '0.06em' }}
        >
          {meal.title}
        </span>
        {mealKcal > 0 && (
          <span className="text-xs text-muted-foreground">{Math.round(mealKcal)} kcal</span>
        )}
      </div>

      {meal.recipes.length > 0 && (
        <div className="px-3 pb-1 space-y-1.5">
          {meal.recipes.map((recipe: RecipeInstance) => {
            const se = recipe.servingsEaten ?? 1;
            const ts = recipe.servings ?? 1;
            const kcal = Math.round(recipe.calories * (se / ts));
            return (
              <div
                key={recipe.instanceId}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: C.bg }}
              >
                <button className="flex-1 min-w-0 text-left" onClick={() => onRecipeClick(recipe)}>
                  <p className="font-medium text-sm leading-tight line-clamp-1">{recipe.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{se} rac · {kcal} kcal</p>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editMode ? (
                    <button
                      onClick={() => onRemoveRecipe(recipe.instanceId)}
                      className="h-7 w-7 rounded-full flex items-center justify-center"
                      style={{ background: C.primaryLight, color: C.primary }}
                      aria-label="Eliminar receta"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onUpdateServings(recipe.instanceId, Math.max(1, se - 1))}
                        className="h-7 w-7 rounded-full flex items-center justify-center"
                        style={{ background: C.beige }}
                        aria-label="Quitar ración"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onUpdateServings(recipe.instanceId, se + 1)}
                        className="h-7 w-7 rounded-full flex items-center justify-center"
                        style={{ background: C.beige }}
                        aria-label="Añadir ración"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-3 pb-3 pt-1.5">
        <button
          onClick={onAddRecipe}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors"
          style={{ border: `0.5px dashed ${C.border}`, color: C.dimText }}
        >
          <Plus className="h-3.5 w-3.5" /> Añadir receta
        </button>
      </div>
    </div>
  );
}

function GridView({
  weekPlan, todayIndex, onOpenDay, onAddRecipe, onRemoveRecipe,
}: {
  weekPlan: DayPlan[];
  todayIndex: number;
  onOpenDay: (dayIndex: number) => void;
  onAddRecipe: (meal: Meal, dayName: DayPlan['day']) => void;
  onRemoveRecipe: (dayName: DayPlan['day'], mealId: string, instanceId: string) => void;
}) {
  const [selectedCell, setSelectedCell] = useState<{
    dayIndex: number;
    mealIndex: number;
    recipe: RecipeInstance;
    dayName: DayPlan['day'];
    meal: Meal;
  } | null>(null);

  const mealRows = weekPlan[0]?.meals ?? [];

  const handleCellTap = (dayIndex: number, mealIndex: number) => {
    const dayPlan = weekPlan[dayIndex];
    const meal = dayPlan?.meals[mealIndex];
    if (!meal) return;
    const dayName = dayPlan.day as DayPlan['day'];
    if (meal.recipes.length > 0) {
      const same = selectedCell?.dayIndex === dayIndex && selectedCell?.mealIndex === mealIndex;
      setSelectedCell(same ? null : { dayIndex, mealIndex, recipe: meal.recipes[0], dayName, meal });
    } else {
      onAddRecipe(meal, dayName);
    }
  };

  return (
    <div
      className="pb-28"
      style={{
        background: C.bg,
        backgroundImage: 'radial-gradient(circle, rgba(217,160,136,0.25) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex" style={{ minWidth: 'max-content' }}>

          {/* Sticky row labels */}
          <div
            className="flex-shrink-0 z-10"
            style={{
              width: 56,
              position: 'sticky',
              left: 0,
              background: 'rgba(242,237,228,0.97)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ height: 32, borderBottom: `0.5px solid ${C.border}` }} />
            {mealRows.map(meal => (
              <div
                key={meal.id}
                style={{
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 6,
                  borderBottom: `0.5px solid ${C.border}`,
                }}
              >
                <span style={{
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                  textAlign: 'right',
                  color: mealColor(meal),
                }}>
                  {meal.title}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex">
            {DAY_ORDER.map((dayName, dayIndex) => {
              const dayPlan = weekPlan[dayIndex];
              const isToday = dayIndex === todayIndex;
              return (
                <div key={dayName} style={{ width: 52, flexShrink: 0 }}>
                  {/* Day header — tap to go to day view */}
                  <button
                    onClick={() => onOpenDay(dayIndex)}
                    style={{
                      width: '100%',
                      height: 32,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: `0.5px solid ${C.border}`,
                      borderRight: `0.5px solid ${C.border}`,
                      background: isToday ? 'rgba(217,82,26,0.06)' : C.card,
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? C.primary : '#6B4020' }}>
                      {DAY_LETTERS[dayIndex]}
                    </span>
                    {isToday && (
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.primary, marginTop: 2 }} />
                    )}
                  </button>

                  {/* Cells — one per meal row */}
                  {mealRows.map((refMeal, mealIndex) => {
                    const actualMeal = dayPlan?.meals[mealIndex];
                    const isEmpty = !actualMeal || actualMeal.recipes.length === 0;
                    const recipe = actualMeal?.recipes[0];
                    const kcal = actualMeal ? Math.round(totalsFor([actualMeal]).calories) : 0;
                    const isSelected = selectedCell?.dayIndex === dayIndex && selectedCell?.mealIndex === mealIndex;
                    const accent = mealColor(refMeal);

                    return (
                      <button
                        key={refMeal.id}
                        onClick={() => handleCellTap(dayIndex, mealIndex)}
                        style={{
                          width: '100%',
                          height: 64,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isEmpty ? 'center' : 'flex-start',
                          justifyContent: isEmpty ? 'center' : 'space-between',
                          padding: isEmpty ? 4 : '5px 4px 4px 6px',
                          borderRight: `0.5px solid ${C.border}`,
                          borderBottom: `0.5px solid ${C.border}`,
                          borderLeft: isSelected ? `2px solid ${C.primary}` : `2px solid ${accent}`,
                          background: isSelected
                            ? 'rgba(217,82,26,0.1)'
                            : isEmpty
                            ? C.bg
                            : isToday ? 'rgba(217,82,26,0.04)' : C.card,
                          textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                      >
                        {isEmpty ? (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            border: `0.5px dashed ${C.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Plus style={{ width: 10, height: 10, color: C.border }} />
                          </div>
                        ) : (
                          <>
                            <p style={{
                              fontSize: 7.5,
                              fontWeight: 500,
                              color: C.brown,
                              lineHeight: 1.25,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            } as React.CSSProperties}>
                              {recipe?.name}
                            </p>
                            {kcal > 0 && (
                              <p style={{ fontSize: 6.5, color: C.muted }}>{kcal} kcal</p>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="flex items-center justify-center gap-1 py-2 text-[10px] text-muted-foreground">
        <ChevronRight className="h-3 w-3" />
        Desliza para ver todos los días
      </div>

      {/* Bottom action bar when a cell is selected */}
      {selectedCell && (
        <div
          className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-t"
          style={{ background: C.card, borderColor: C.border }}
        >
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-xs font-semibold text-primary">
              {selectedCell.meal.title} · {DAY_ORDER[selectedCell.dayIndex]}
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{selectedCell.recipe.name}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => { onAddRecipe(selectedCell.meal, selectedCell.dayName); setSelectedCell(null); }}
              className="text-xs border border-border rounded-full px-3 py-1.5 bg-card text-muted-foreground"
            >
              Cambiar
            </button>
            <button
              onClick={() => {
                onRemoveRecipe(selectedCell.dayName, selectedCell.meal.id, selectedCell.recipe.instanceId);
                setSelectedCell(null);
              }}
              className="text-xs rounded-full px-3 py-1.5"
              style={{ border: `0.5px solid ${C.primaryBorder}`, background: C.primaryLight, color: C.primary }}
            >
              Quitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyDay({ onAddMeal }: { onAddMeal: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <UtensilsCrossed className="h-12 w-12 text-muted-foreground/20 mb-4" />
      <p className="font-semibold text-foreground/60 text-base">Sin comidas planificadas</p>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Empieza añadiendo las comidas del día.</p>
      <Button onClick={onAddMeal} className="rounded-full px-6 bg-primary text-primary-foreground">
        <Plus className="mr-1.5 h-4 w-4" /> Añadir comida
      </Button>
    </div>
  );
}
