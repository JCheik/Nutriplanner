'use client';

import { useUser } from '@/firebase/auth/use-user';
import Dashboard from './dashboard/page';
import LandingPage from './landing/page';
import { Logo } from '@/components/icons/logo';

export default function Home() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu planificador...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}
