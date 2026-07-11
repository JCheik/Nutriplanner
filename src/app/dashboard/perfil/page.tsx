'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleUserRound, History, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/firebase';
import { useDiary } from '@/hooks/use-diary';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useWeekHistory } from '@/hooks/use-week-history';
import { GoalsContent } from '@/components/nutri-planner/floating-goals';
import { WeightCard, ProgressCharts } from '@/components/nutri-planner/progress-section';
import { WeekHistorySheet } from '@/components/nutri-planner/week-history-sheet';

type PerfilTab = 'progreso' | 'objetivos' | 'historial';
const VALID_TABS: PerfilTab[] = ['progreso', 'objetivos', 'historial'];

/**
 * Desktop profile hub — the web counterpart of /mobile/perfil. Same three tabs
 * (progress tracking, goals, week history) reusing the shared components, laid
 * out for a wide screen.
 */
export default function DashboardPerfilPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as PerfilTab | null;
  const initialTab: PerfilTab = requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : 'progreso';

  const diary = useDiary();
  const profileState = useUserProfileState();
  const weekPlanState = useWeekPlanState();
  const { history, isLoading: historyLoading, saveCurrentWeek, deleteSnapshot } = useWeekHistory();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Identity header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/dashboard" aria-label="Volver al planificador">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Avatar className="h-14 w-14">
            <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? 'Perfil'} />
            <AvatarFallback>
              <CircleUserRound className="h-7 w-7 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold font-headline leading-tight truncate">
              {user?.displayName ?? 'Tu perfil'}
            </h1>
            {user?.email && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
          </div>
        </div>

        <Tabs defaultValue={initialTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="progreso">Progreso</TabsTrigger>
            <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="progreso" className="mt-4">
            {/* Weight card on the left, charts stacked on the right (wide screens). */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <WeightCard
                  key={diary.selectedDate}
                  savedWeight={diary.day?.weightKg}
                  onSave={(kg) => diary.setWeight(kg)}
                />
              </div>
              <div className="lg:col-span-2 space-y-4">
                <ProgressCharts
                  recentDays={diary.recentDays}
                  goalCalories={profileState.activeGoalMacros?.calories ?? null}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="objetivos" className="mt-4">
            <Card className="bg-glass">
              <CardContent className="p-0">
                <GoalsContent
                  result={profileState.currentCalorieResult}
                  activeGoal={profileState.activeGoal}
                  onCalorieResultSave={profileState.handleCalorieResultSave}
                  onGoalSelect={profileState.handleActiveGoalChange}
                  onSaveCustomGoal={profileState.handleSaveCustomGoal}
                  dietPreference={profileState.currentDietPreference}
                  onDietPreferenceChange={profileState.handleDietPreferenceChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial" className="mt-4">
            <Card className="bg-glass">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Historial de semanas
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Guarda la semana actual como plantilla o recupera una semana anterior
                  {history.length > 0 ? ` (${history.length} guardada${history.length === 1 ? '' : 's'})` : ''}.
                </p>
                <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
                  <History className="mr-2 h-4 w-4" />
                  Abrir historial
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <WeekHistorySheet
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        weekPlan={weekPlanState.currentWeekPlan ?? []}
        history={history}
        isLoading={historyLoading}
        onSave={saveCurrentWeek}
        onDelete={deleteSnapshot}
        onRestore={(days) => {
          weekPlanState.handleRestoreWeek(days);
          setIsHistoryOpen(false);
        }}
      />
    </div>
  );
}
