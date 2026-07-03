'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, Plus, X, NotebookPen, CalendarDays, Scale,
  PackageSearch, PencilLine, TrendingUp, Flame, Check, UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useDiary, dateKeyToDate } from '@/hooks/use-diary';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { DAY_ORDER } from '@/lib/data';
import type { DiaryEntry, DayPlan, RecipeInstance } from '@/lib/types';
import type { OffProduct } from '@/lib/open-food-facts';
import { OffSearchDialog } from './off-search-dialog';

const SOURCE_LABEL: Record<DiaryEntry['source'], string> = {
  plan: 'Del plan',
  off: 'Open Food Facts',
  manual: 'Manual',
};

function fmtDateLabel(dateKey: string, isToday: boolean): string {
  if (isToday) return 'Hoy';
  return format(dateKeyToDate(dateKey), "EEE d 'de' MMMM", { locale: es });
}

/** Weekday name (Lunes…Domingo) for a diary date, to look up the week plan. */
function planDayNameFor(dateKey: string): DayPlan['day'] {
  const js = dateKeyToDate(dateKey).getDay();
  return DAY_ORDER[js === 0 ? 6 : js - 1];
}

export function DiaryPageContent() {
  const diary = useDiary();
  const { activeGoalMacros } = useUserProfileState();
  const { currentWeekPlan } = useWeekPlanState();
  const { toast } = useToast();

  const [isOffSearchOpen, setIsOffSearchOpen] = useState(false);
  const [offProduct, setOffProduct] = useState<OffProduct | null>(null);
  const [isPlanPickerOpen, setIsPlanPickerOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const entries = diary.day?.entries ?? [];
  const goal = activeGoalMacros;
  const kcalPercent = goal?.calories
    ? Math.min(100, (diary.totals.calories / goal.calories) * 100)
    : 0;

  const planDay = useMemo(() => {
    const dayName = planDayNameFor(diary.selectedDate);
    return currentWeekPlan.find((d) => d.day === dayName) ?? null;
  }, [currentWeekPlan, diary.selectedDate]);

  const addFromPlan = (recipe: RecipeInstance) => {
    const scale = (recipe.servingsEaten ?? 1) / (recipe.servings ?? 1);
    diary.addEntry({
      name: recipe.name,
      calories: recipe.calories * scale,
      protein: recipe.protein * scale,
      carbs: recipe.carbs * scale,
      fat: recipe.fat * scale,
      quantityLabel: `${recipe.servingsEaten ?? 1} rac`,
      source: 'plan',
    });
    toast({ title: 'Añadido al diario', description: recipe.name });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <NotebookPen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-headline">Diario</h1>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => diary.goDay(-1)} aria-label="Día anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm capitalize truncate">
              {fmtDateLabel(diary.selectedDate, diary.isToday)}
            </span>
            {!diary.isToday && (
              <Button variant="secondary" size="sm" className="h-7 rounded-full text-xs" onClick={diary.goToday}>
                Hoy
              </Button>
            )}
          </div>
          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            onClick={() => diary.goDay(1)}
            disabled={diary.isToday}
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="day" className="flex-1 flex flex-col min-h-0 px-4">
        <TabsList className="grid w-full grid-cols-2 shrink-0">
          <TabsTrigger value="day">Día</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
        </TabsList>

        {/* ── DAY TAB ── */}
        <TabsContent value="day" className="flex-1 min-h-0 overflow-y-auto pb-28 mt-3 space-y-3">
          {/* Totals vs goal */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Comido {diary.isToday ? 'hoy' : 'este día'}
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-bold text-primary text-sm">{Math.round(diary.totals.calories)}</span>
                {goal ? ` / ${Math.round(goal.calories)}` : ''} kcal
              </span>
            </div>
            {goal ? (
              <>
                <div className="h-2 rounded-full bg-secondary overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${kcalPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Proteína', value: diary.totals.protein, target: goal.protein },
                    { label: 'Carbohidratos', value: diary.totals.carbs, target: goal.carbs },
                    { label: 'Grasa', value: diary.totals.fat, target: goal.fat },
                  ].map(({ label, value, target }) => (
                    <div key={label} className="flex flex-col items-center">
                      <span className="font-bold text-base">
                        {Math.round(value)}<span className="text-xs font-normal text-muted-foreground">g</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
                      <span className="text-[10px] text-muted-foreground/60">de {Math.round(target)}g</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Configura tu objetivo en «Objetivos» para comparar lo que comes con tu meta.
              </p>
            )}
          </div>

          {/* Add buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setIsPlanPickerOpen(true)}
              className="flex flex-col items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 py-3 text-primary"
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span className="text-[11px] font-medium">Del plan</span>
            </button>
            <button
              onClick={() => setIsOffSearchOpen(true)}
              className="flex flex-col items-center gap-1 rounded-xl border py-3 bg-card text-muted-foreground"
            >
              <PackageSearch className="h-4 w-4" />
              <span className="text-[11px] font-medium">Buscar / escanear</span>
            </button>
            <button
              onClick={() => setIsManualOpen(true)}
              className="flex flex-col items-center gap-1 rounded-xl border py-3 bg-card text-muted-foreground"
            >
              <PencilLine className="h-4 w-4" />
              <span className="text-[11px] font-medium">Manual</span>
            </button>
          </div>

          {/* Entries */}
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-muted-foreground">
              <NotebookPen className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="font-medium text-sm">Nada apuntado {diary.isToday ? 'hoy' : 'este día'}</p>
              <p className="text-xs mt-1">Añade lo que has comido desde el plan, buscando un producto o a mano.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight line-clamp-1">{entry.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.quantityLabel ? `${entry.quantityLabel} · ` : ''}
                      {Math.round(entry.calories)} kcal · {Math.round(entry.protein)}g prot
                      <span className="text-muted-foreground/50"> · {SOURCE_LABEL[entry.source]}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => diary.removeEntry(entry.id)}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-destructive bg-destructive/5 shrink-0"
                    aria-label={`Quitar ${entry.name} del diario`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Weight */}
          <WeightCard
            key={diary.selectedDate}
            savedWeight={diary.day?.weightKg}
            onSave={(kg) => diary.setWeight(kg)}
          />
        </TabsContent>

        {/* ── PROGRESS TAB ── */}
        <TabsContent value="progress" className="flex-1 min-h-0 overflow-y-auto pb-28 mt-3 space-y-3">
          <ProgressCharts
            recentDays={diary.recentDays}
            goalCalories={goal?.calories ?? null}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <OffSearchDialog
        isOpen={isOffSearchOpen}
        onClose={() => setIsOffSearchOpen(false)}
        onSelect={(p) => setOffProduct(p)}
        description="Busca lo que has comido y apúntalo con sus macros reales."
      />
      <OffQuantityDialog
        product={offProduct}
        onClose={() => setOffProduct(null)}
        onConfirm={(p, grams) => {
          const scale = grams / 100;
          diary.addEntry({
            name: p.brand ? `${p.name} (${p.brand})` : p.name,
            calories: p.per100g.calories * scale,
            protein: p.per100g.protein * scale,
            carbs: p.per100g.carbs * scale,
            fat: p.per100g.fat * scale,
            quantityLabel: `${grams} g`,
            source: 'off',
          });
          setOffProduct(null);
          toast({ title: 'Añadido al diario', description: p.name });
        }}
      />
      <PlanPickerDialog
        isOpen={isPlanPickerOpen}
        onClose={() => setIsPlanPickerOpen(false)}
        planDay={planDay}
        onAdd={addFromPlan}
      />
      <ManualEntryDialog
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onSave={(entry) => {
          diary.addEntry(entry);
          setIsManualOpen(false);
          toast({ title: 'Añadido al diario', description: entry.name });
        }}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function WeightCard({ savedWeight, onSave }: { savedWeight?: number; onSave: (kg: number | null) => void }) {
  const [value, setValue] = useState<string>(savedWeight !== undefined ? String(savedWeight) : '');
  const parsed = Number(value.replace(',', '.'));
  const isValid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 20 && parsed < 400;
  const isDirty = value.trim() !== (savedWeight !== undefined ? String(savedWeight) : '');

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Peso del día</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="ej: 72.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground">kg</span>
        <Button size="sm" disabled={!isValid || !isDirty} onClick={() => onSave(Math.round(parsed * 10) / 10)}>
          <Check className="h-4 w-4 mr-1" /> Guardar
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Apúntalo a diario (mejor por la mañana) para ver tu evolución en «Progreso».
      </p>
    </div>
  );
}

function OffQuantityDialog({
  product, onClose, onConfirm,
}: {
  product: OffProduct | null;
  onClose: () => void;
  onConfirm: (product: OffProduct, grams: number) => void;
}) {
  const [grams, setGrams] = useState('100');
  const parsed = Number(grams);
  const isValid = Number.isFinite(parsed) && parsed > 0 && parsed <= 5000;
  const kcal = product && isValid ? Math.round((product.per100g.calories * parsed) / 100) : null;

  return (
    <Dialog open={product !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm bg-glass">
        <DialogHeader>
          <DialogTitle className="text-lg leading-snug">{product?.name}</DialogTitle>
          <DialogDescription>¿Qué cantidad has comido?</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            autoFocus
          />
          <span className="text-sm text-muted-foreground shrink-0">g / ml</span>
        </div>
        {kcal !== null && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-400" />
            Equivale a <span className="font-semibold text-foreground">{kcal} kcal</span>
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!isValid} onClick={() => product && onConfirm(product, parsed)}>
            <Plus className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanPickerDialog({
  isOpen, onClose, planDay, onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  planDay: DayPlan | null;
  onAdd: (recipe: RecipeInstance) => void;
}) {
  const rows = (planDay?.meals ?? []).flatMap((meal) =>
    meal.recipes.map((recipe) => ({ meal, recipe }))
  );

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80dvh] flex flex-col bg-glass">
        <DialogHeader className="shrink-0">
          <DialogTitle>Añadir del plan</DialogTitle>
          <DialogDescription>
            {planDay ? `Lo planificado para el ${planDay.day.toLowerCase()}.` : 'No hay plan para este día.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6">
          <div className="px-6 space-y-2 pb-2">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay recetas planificadas este día.
              </p>
            ) : (
              rows.map(({ meal, recipe }) => {
                const scale = (recipe.servingsEaten ?? 1) / (recipe.servings ?? 1);
                return (
                  <div key={recipe.instanceId} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {meal.title}
                      </p>
                      <p className="font-medium text-sm leading-tight line-clamp-1">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipe.servingsEaten ?? 1} rac · {Math.round(recipe.calories * scale)} kcal
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onAdd(recipe)}>
                      <Plus className="h-4 w-4 mr-1" /> Añadir
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualEntryDialog({
  isOpen, onClose, onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: { name: string; calories: number; protein: number; carbs: number; fat: number; quantityLabel?: string; source: 'manual' }) => void;
}) {
  const [name, setName] = useState('');
  const [quantityLabel, setQuantityLabel] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const reset = () => {
    setName(''); setQuantityLabel(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
  };

  const canSave = name.trim() !== '' && Number.isFinite(Number(calories)) && Number(calories) >= 0 && calories !== '';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm bg-glass max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entrada manual</DialogTitle>
          <DialogDescription>Apunta algo que comiste sin buscarlo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="diary-name">¿Qué comiste?</Label>
            <Input id="diary-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: café con leche" />
          </div>
          <div>
            <Label htmlFor="diary-qty">Cantidad <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="diary-qty" value={quantityLabel} onChange={(e) => setQuantityLabel(e.target.value)} placeholder="ej: 1 taza" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="diary-kcal">Calorías (kcal)</Label>
              <Input id="diary-kcal" type="number" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="diary-prot">Proteína (g)</Label>
              <Input id="diary-prot" type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="diary-carbs">Carbs (g)</Label>
              <Input id="diary-carbs" type="number" inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="diary-fat">Grasa (g)</Label>
              <Input id="diary-fat" type="number" inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button
            disabled={!canSave}
            onClick={() => {
              onSave({
                name: name.trim(),
                calories: Number(calories) || 0,
                protein: Number(protein) || 0,
                carbs: Number(carbs) || 0,
                fat: Number(fat) || 0,
                ...(quantityLabel.trim() ? { quantityLabel: quantityLabel.trim() } : {}),
                source: 'manual',
              });
              reset();
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgressCharts({
  recentDays, goalCalories,
}: {
  recentDays: { date: string; entries?: DiaryEntry[]; weightKg?: number }[];
  goalCalories: number | null;
}) {
  const weightData = recentDays
    .filter((d) => typeof d.weightKg === 'number')
    .map((d) => ({
      label: format(dateKeyToDate(d.date), 'd/M'),
      peso: d.weightKg as number,
    }));

  const kcalData = recentDays
    .map((d) => ({
      label: format(dateKeyToDate(d.date), 'd/M'),
      kcal: Math.round((d.entries ?? []).reduce((sum, e) => sum + e.calories, 0)),
    }))
    .filter((d) => d.kcal > 0);

  const hasAnything = weightData.length > 0 || kcalData.length > 0;

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-6 text-muted-foreground">
        <TrendingUp className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="font-medium text-sm">Aún no hay datos de progreso</p>
        <p className="text-xs mt-1">
          Apunta lo que comes y tu peso cada día; aquí verás la evolución de los últimos 30 días.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Peso (últimos 30 días)
          </span>
        </div>
        {weightData.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sin pesajes todavía. Guarda tu peso en la pestaña «Día».
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={weightData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip
                formatter={(v: number) => [`${v} kg`, 'Peso']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Calorías por día
          </span>
        </div>
        {kcalData.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sin comidas apuntadas todavía.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={kcalData} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => [`${v} kcal`, 'Comido']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                {goalCalories && (
                  <ReferenceLine
                    y={goalCalories}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    label={{ value: 'Objetivo', fontSize: 10, fill: 'hsl(var(--primary))', position: 'insideTopRight' }}
                  />
                )}
                <Bar dataKey="kcal" fill="hsl(var(--primary) / 0.75)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {goalCalories && (
              <p className="text-[11px] text-muted-foreground mt-2">
                La línea discontinua es tu objetivo diario ({Math.round(goalCalories)} kcal).
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
