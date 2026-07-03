'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleUserRound, History } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/firebase';
import { useDiary } from '@/hooks/use-diary';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useWeekHistory } from '@/hooks/use-week-history';
import { GoalsContent } from './floating-goals';
import { WeightCard, ProgressCharts } from './progress-section';
import { WeekHistorySheet } from './week-history-sheet';

type PerfilTab = 'progreso' | 'objetivos' | 'historial';

const VALID_TABS: PerfilTab[] = ['progreso', 'objetivos', 'historial'];

/**
 * The user's personal hub: progress (weight + charts), goals and the week
 * history. Everything "about you" lives here, keeping the plan screen about
 * planning and eating.
 */
export function PerfilPageContent() {
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
    <div className="flex flex-col h-full">
      {/* Identity header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? 'Perfil'} />
          <AvatarFallback>
            <CircleUserRound className="h-6 w-6 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-bold font-headline leading-tight truncate">
            {user?.displayName ?? 'Tu perfil'}
          </h1>
          {user?.email && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="flex-1 flex flex-col min-h-0 px-4">
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="progreso">Progreso</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="progreso" className="flex-1 min-h-0 overflow-y-auto pb-28 mt-3 space-y-3">
          <WeightCard
            key={diary.selectedDate}
            savedWeight={diary.day?.weightKg}
            onSave={(kg) => diary.setWeight(kg)}
          />
          <ProgressCharts
            recentDays={diary.recentDays}
            goalCalories={profileState.activeGoalMacros?.calories ?? null}
          />
        </TabsContent>

        <TabsContent value="objetivos" className="flex-1 min-h-0 overflow-y-auto pb-28">
          <GoalsContent
            result={profileState.currentCalorieResult}
            activeGoal={profileState.activeGoal}
            onCalorieResultSave={profileState.handleCalorieResultSave}
            onGoalSelect={profileState.handleActiveGoalChange}
            onSaveCustomGoal={profileState.handleSaveCustomGoal}
            dietPreference={profileState.currentDietPreference}
            onDietPreferenceChange={profileState.handleDietPreferenceChange}
          />
        </TabsContent>

        <TabsContent value="historial" className="flex-1 min-h-0 overflow-y-auto pb-28 mt-3 space-y-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Historial de semanas
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Guarda la semana actual como plantilla o recupera una semana anterior
              {history.length > 0 ? ` (${history.length} guardada${history.length === 1 ? '' : 's'})` : ''}.
            </p>
            <Button className="w-full" variant="outline" onClick={() => setIsHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              Abrir historial
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
