'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleUserRound, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/firebase';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { GoalsContent } from '@/components/nutri-planner/floating-goals';
import { PortionSizeCard } from '@/components/nutri-planner/portion-size-card';
import { NutriInterviewCard } from '@/components/nutri-planner/nutri-interview';

type PerfilTab = 'objetivos' | 'entrevista';
const VALID_TABS: PerfilTab[] = ['objetivos', 'entrevista'];

/**
 * Desktop profile hub, "Mi Laboratorio". Solo Objetivos + Entrevista: el
 * seguimiento de peso/progreso se retiró (quedaba redundante con "recalcular"
 * en Objetivos), y el historial de semanas vive en el botón "Historial" del
 * planificador principal — mismo WeekHistorySheet, sin duplicar el punto de
 * entrada aquí. El equivalente móvil (perfil-page-content.tsx) conserva sus
 * pestañas tal cual, sin tocar.
 */
export default function DashboardPerfilPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as PerfilTab | null;
  const initialTab: PerfilTab = requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : 'objetivos';

  const profileState = useUserProfileState();
  // Para el paso de "platos fijos": se buscan entre las tuyas y las de Nutrilp,
  // igual que en el móvil.
  const { currentUserRecipes, nutriplannerRecipes } = useRecipeState();
  const pickableRecipes = useMemo(
    () => [...currentUserRecipes, ...nutriplannerRecipes].map(r => ({ id: r.id, name: r.name })),
    [currentUserRecipes, nutriplannerRecipes]
  );

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
            <p className="text-xs font-semibold uppercase tracking-wide text-primary leading-none mb-1">Mi Laboratorio</p>
            <h1 className="text-2xl font-bold font-headline leading-tight truncate">
              {user?.displayName ?? 'Tu perfil'}
            </h1>
            {user?.email && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
          </div>
        </div>

        <Tabs defaultValue={initialTab}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
            <TabsTrigger value="entrevista">Entrevista</TabsTrigger>
          </TabsList>

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
                <PortionSizeCard
                  factor={profileState.portionFactor}
                  isManual={profileState.isPortionFactorManual}
                  onChange={profileState.handlePortionFactorChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entrevista" className="mt-4">
            <NutriInterviewCard
              interview={profileState.nutriInterview}
              onSave={profileState.handleNutriInterviewSave}
              recipes={pickableRecipes}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
