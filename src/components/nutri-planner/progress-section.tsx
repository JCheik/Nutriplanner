'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Scale, Flame, TrendingUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dateKeyToDate } from '@/hooks/use-diary';
import type { DiaryEntry } from '@/lib/types';

/** Daily weigh-in input, prefilled with the saved value for the day. */
export function WeightCard({ savedWeight, onSave }: { savedWeight?: number; onSave: (kg: number | null) => void }) {
  const [value, setValue] = useState<string>(savedWeight !== undefined ? String(savedWeight) : '');
  const parsed = Number(value.replace(',', '.'));
  const isValid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 20 && parsed < 400;
  const isDirty = value.trim() !== (savedWeight !== undefined ? String(savedWeight) : '');

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Peso de hoy</span>
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
        Apúntalo a diario (mejor por la mañana) para ver tu evolución abajo.
      </p>
    </div>
  );
}

/** Weight + calories charts over the last 30 days of diary data. */
export function ProgressCharts({
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
          Marca lo que comes en el plan (✓) y apunta tu peso; aquí verás la evolución de los últimos 30 días.
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
            Sin pesajes todavía. Guarda tu peso arriba.
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
            Sin comidas apuntadas todavía. Marca con ✓ lo que comas en el plan.
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
