'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { GoalsContent } from '@/components/nutri-planner/floating-goals';
import { Logo } from '@/components/icons/logo';
import { Target } from 'lucide-react';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando tus objetivos...</p>
        </div>
    </div>
);

function MobileGoalsWrapper() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace('/');
        }
    }, [userLoading, user, router]);

    const profileState = useUserProfileState();

    if (userLoading) {
        return <MobilePageLoader />;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
                <Target className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold font-headline">Tus Objetivos</h1>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                <GoalsContent
                    result={profileState.currentCalorieResult}
                    activeGoal={profileState.activeGoal}
                    onCalorieResultSave={profileState.handleCalorieResultSave}
                    onGoalSelect={profileState.handleActiveGoalChange}
                    onSaveCustomGoal={profileState.handleSaveCustomGoal}
                    dietPreference={profileState.currentDietPreference}
                    onDietPreferenceChange={profileState.handleDietPreferenceChange}
                />
            </div>
        </div>
    );
}

export default function MobileGoalsPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileGoalsWrapper />
        </Suspense>
    );
}
