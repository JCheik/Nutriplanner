'use client';

import { useState, useEffect } from 'react';
import { useUser, signInWithGoogle } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase/provider';
import Dashboard from './dashboard/page';
import MobilePage from './mobile/page';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/use-media-query';

export default function Home() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleSignIn = async () => {
    if (auth && firestore) {
      await signInWithGoogle(auth, firestore);
    }
  };

  const handleGuestMode = () => {
    setIsGuest(true);
  };
  
  const handleExitGuestMode = () => {
    setIsGuest(false);
  }

  // Show a generic loader while determining auth state and screen size.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // If user is logged in or is a guest, show the appropriate dashboard.
  if (user || isGuest) {
    if (isMobile) {
      return <MobilePage isGuestMode={isGuest} onExitGuestMode={handleExitGuestMode} />;
    }
    return <Dashboard isGuestMode={isGuest} onExitGuestMode={handleExitGuestMode} />;
  }

  // Otherwise, show the welcome/login screen.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mx-auto w-[350px] space-y-6 text-center">
        <div className="space-y-2">
            <div className="flex justify-center mb-2">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Bienvenido a NutriPlanner</h1>
          <p className="text-balance text-muted-foreground">
            Planifica tus comidas, crea recetas y alcanza tus objetivos nutricionales.
          </p>
        </div>
        <div className="space-y-4">
          <Button
            onClick={handleSignIn}
            className="w-full h-11 text-base"
            size="lg"
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.4 96 248 96c-84.3 0-152.3 67.8-152.3 152s68 152 152.3 152c92.8 0 140.3-61.5 143.8-92.6H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Iniciar Sesión con Google
          </Button>
          <Button
            onClick={handleGuestMode}
            className="w-full h-11 text-base"
            size="lg"
            variant="secondary"
          >
            Continuar como Invitado
          </Button>
        </div>
      </div>
    </div>
  );
}
