'use client';

import { useState, useEffect } from 'react';
import { useUser, signInWithGoogle } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase/provider';
import Dashboard from './dashboard/page';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};


export default function Home() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (user && isMobile) {
      router.replace('/mobile');
    }
  }, [user, isMobile, router]);


  const handleSignIn = async () => {
    if (auth && firestore) {
      await signInWithGoogle(auth, firestore);
    }
  };

  const handleGuestMode = () => {
    if (isMobile) {
        // On mobile, guest mode should also go to the mobile page.
        router.push('/mobile?guest=true');
    } else {
        setIsGuest(true);
    }
  };
  
  const handleExitGuestMode = () => {
    setIsGuest(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu planificador...</p>
        </div>
      </div>
    );
  }

  if (user && !isMobile) {
    // If the user is logged in on desktop, show the dashboard
    return <Dashboard isGuestMode={false} onExitGuestMode={handleExitGuestMode} />;
  }

  if (isGuest && !isMobile) {
    // If in guest mode on desktop, show the dashboard
    return <Dashboard isGuestMode={true} onExitGuestMode={handleExitGuestMode} />;
  }
  
  if (user && isMobile) {
    // This state will be brief as the useEffect above will redirect.
    // Showing a loader here prevents a flash of the login screen.
    return (
       <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }


  // Otherwise, show the welcome/login screen
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md bg-glass text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Logo className="h-16 w-16 text-primary" />
          </div>
          <CardTitle>Bienvenido a NutriPlanner</CardTitle>
          <CardDescription>
            Planifica tus comidas, crea recetas y alcanza tus objetivos nutricionales. Inicia sesión para guardar tu progreso o prueba la aplicación como invitado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={handleSignIn}
            className="w-full h-12 text-base"
            size="lg"
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.4 96 248 96c-84.3 0-152.3 67.8-152.3 152s68 152 152.3 152c92.8 0 140.3-61.5 143.8-92.6H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Iniciar Sesión con Google
          </Button>
          <Button
            onClick={handleGuestMode}
            className="w-full h-12 text-base"
            size="lg"
            variant="secondary"
          >
            Continuar como Invitado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
