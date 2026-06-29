'use client';

import { useEffect, Suspense } from 'react';
import { useUser, signInWithGoogle } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase/provider';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { NutritionalDisclaimer } from '@/components/nutri-planner/nutritional-disclaimer';

function AuthContent() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    // Read the viewport synchronously at redirect time instead of relying on a
    // useMediaQuery hook whose value only commits after a post-paint effect.
    // On a fast cached-auth restore that hook can still read its initial `false`,
    // which would bounce mobile users to the desktop dashboard.
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches;

    router.replace(isMobile ? '/mobile' : '/dashboard');
  }, [user, loading, router]);


  const handleSignIn = async () => {
    if (auth && firestore) {
      await signInWithGoogle(auth, firestore);
    }
  };

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // If no user, show the login page
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mx-auto w-[350px] space-y-6 text-center">
        <div className="space-y-2">
            <div className="flex justify-center mb-2">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Bienvenido a Nutrilp</h1>
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
        </div>
        <NutritionalDisclaimer className="text-left justify-center" />
      </div>
    </div>
  );
}


export default function Home() {
  return (
    <Suspense fallback={
       <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
