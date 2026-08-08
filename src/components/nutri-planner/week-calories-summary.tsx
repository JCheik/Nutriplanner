'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GoalMacros, Macros } from '@/lib/types';

/**
 * Resumen de calorías de la semana, entre el cuadrante y la biblioteca.
 *
 * Es el mismo que ya tenía la app en su vista de Semana, traído a la web: en
 * el cuadrante se ven los totales DÍA a día, pero no había ningún sitio donde
 * mirar la semana entera de un vistazo — que es como se piensa realmente
 * (un día flojo compensa uno fuerte).
 */

/**
 * Verde en objetivo, ámbar cerca, terracota lejos. Mismos cortes que la app
 * (`fitColor` en la vista de Semana) para que un plan no se vea "bien" en un
 * sitio y "mal" en el otro.
 */
function fitClass(value: number, goal?: number): string {
  if (!goal || goal <= 0) return 'text-muted-foreground';
  const ratio = value / goal;
  if (ratio >= 0.9 && ratio <= 1.1) return 'text-accent';
  if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) return 'text-amber-500';
  return 'text-primary';
}

function barClass(value: number, goal?: number): string {
  if (!goal || goal <= 0) return 'bg-muted-foreground';
  const ratio = value / goal;
  if (ratio >= 0.9 && ratio <= 1.1) return 'bg-accent';
  if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) return 'bg-amber-500';
  return 'bg-primary';
}

const nf = (n: number) => Math.round(n).toLocaleString('es-ES');

export function WeekCaloriesSummary({
  dailyTotals,
  activeGoal,
  freeMealsPerWeek = 0,
}: {
  /** Tal cual los devuelve `useDashboard`: un día por entrada. */
  dailyTotals: { day: string; totals: Macros }[];
  activeGoal: GoalMacros | null;
  /** De la entrevista: explica para qué es el margen que sobra. */
  freeMealsPerWeek?: number;
}) {
  const weekPlanned = dailyTotals.reduce((sum, d) => sum + d.totals.calories, 0);
  const daysWithPlan = dailyTotals.filter(d => d.totals.calories > 0).length;
  const weekGoal = activeGoal ? activeGoal.calories * 7 : 0;
  const weekMargin = weekGoal - weekPlanned;
  // Se recorta al 100% para que la barra no se salga al pasarse del objetivo;
  // el color ya avisa de que se ha ido.
  const pct = weekGoal > 0 ? Math.min(100, (weekPlanned / weekGoal) * 100) : 0;

  const stats = [
    { label: 'OBJETIVO DIARIO', value: activeGoal ? `${nf(activeGoal.calories)}` : '—', unit: activeGoal ? 'kcal' : '' },
    { label: 'DÍAS AGENDADOS', value: `${daysWithPlan}`, unit: '/ 7' },
    {
      label: 'MEDIA POR DÍA',
      value: daysWithPlan > 0 ? nf(weekPlanned / daysWithPlan) : '—',
      unit: daysWithPlan > 0 ? 'kcal' : '',
    },
    { label: 'TOTAL PROGRAMADO', value: nf(weekPlanned), unit: 'kcal' },
  ];

  return (
    <Card className="bg-glass">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="min-w-0">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold sm:text-2xl">
                {s.value}
                {s.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {activeGoal && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">TODA LA SEMANA</p>
              <p className="text-xs text-muted-foreground">
                <span className={cn('font-bold', fitClass(weekPlanned, weekGoal))}>{nf(weekPlanned)}</span>
                {` de ${nf(weekGoal)} kcal`}
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', barClass(weekPlanned, weekGoal))}
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* El margen solo significa "hueco para comidas libres" si la semana
                está entera: con días vacíos, lo que sobra es plan por hacer. */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {daysWithPlan < 7
                ? `Te quedan ${7 - daysWithPlan} día${7 - daysWithPlan === 1 ? '' : 's'} sin planificar, así que este total todavía va a subir.`
                : weekMargin > 0
                  ? `La semana entera está planificada y te sobran ${nf(weekMargin)} kcal.${
                      freeMealsPerWeek
                        ? ` Es el hueco que te he dejado para tus ${freeMealsPerWeek} comida${freeMealsPerWeek === 1 ? '' : 's'} libre${freeMealsPerWeek === 1 ? '' : 's'}: al comer fuera, borra del plan la comida que te saltes.`
                        : ''
                    }`.trim()
                  : `Te has pasado ${nf(-weekMargin)} kcal en el total de la semana. Un día flojo lo compensa.`}
            </p>
          </div>
        )}

        {!activeGoal && (
          <p className="border-t pt-4 text-xs text-muted-foreground">
            Define tu objetivo diario en Mi Laboratorio y aquí verás cuánto te queda cada semana.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
