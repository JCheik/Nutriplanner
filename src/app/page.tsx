'use client';

import { useEffect, useState, Suspense } from 'react';
import { useUser, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase/provider';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NutritionalDisclaimer } from '@/components/nutri-planner/nutritional-disclaimer';
import { prefersDesktop } from '@/lib/mobile-redirect';

type EmailMode = 'signin' | 'signup';

function AuthContent() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const [mode, setMode] = useState<EmailMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;

    // Read the viewport synchronously at redirect time instead of relying on a
    // useMediaQuery hook whose value only commits after a post-paint effect.
    // On a fast cached-auth restore that hook can still read its initial `false`,
    // which would bounce mobile users to the desktop dashboard.
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches;

    // `/mobile` es ahora el aterrizaje que ofrece la app. Si el usuario ya eligió
    // seguir en la web desde ahí, no se le devuelve (ver mobile-redirect.ts).
    router.replace(isMobile && !prefersDesktop() ? '/mobile' : '/dashboard');
  }, [user, loading, router]);


  const handleGoogleSignIn = async () => {
    if (auth && firestore) {
      await signInWithGoogle(auth, firestore);
    }
  };

  const handleEmailSubmit = async () => {
    if (!auth || !firestore || isSubmitting) return;
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Escribe tu nombre para crear la cuenta.');
      return;
    }

    setIsSubmitting(true);
    const result = mode === 'signup'
      ? await signUpWithEmail(auth, firestore, { name, email, password })
      : await signInWithEmail(auth, firestore, { email, password });
    setIsSubmitting(false);

    if (!result.ok) setError(result.error);
    // On success the auth listener redirects via the effect above.
  };

  const handleResetPassword = async () => {
    if (!auth || isSubmitting) return;
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Escribe tu correo arriba y vuelve a pulsar «He olvidado mi contraseña».');
      return;
    }
    setIsSubmitting(true);
    const result = await resetPassword(auth, email);
    setIsSubmitting(false);
    if (result.ok) {
      setInfo(`Te hemos enviado un correo a ${email.trim()} para restablecer la contraseña.`);
    } else {
      setError(result.error);
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
    <div className="flex items-center justify-center min-h-screen py-8">
      <div className="mx-auto w-[350px] space-y-5 text-center">
        <div className="space-y-2">
            <div className="flex justify-center mb-2">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Bienvenido a Nutrilp</h1>
          <p className="text-balance text-muted-foreground">
            Planifica tus comidas, crea recetas y alcanza tus objetivos nutricionales.
          </p>
        </div>

        <Button
          onClick={handleGoogleSignIn}
          className="w-full h-11 text-base"
          size="lg"
        >
          <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.4 96 248 96c-84.3 0-152.3 67.8-152.3 152s68 152 152.3 152c92.8 0 140.3-61.5 143.8-92.6H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          Iniciar Sesión con Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o con tu correo</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3 text-left">
          {mode === 'signup' && (
            <div className="space-y-1">
              <Label htmlFor="auth-name">Nombre</Label>
              <Input
                id="auth-name"
                autoComplete="name"
                placeholder="¿Cómo te llamas?"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="auth-email">Correo</Label>
            <Input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="auth-password">Contraseña</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSubmit(); }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}

          <Button
            variant="secondary"
            className="w-full h-11 text-base"
            onClick={handleEmailSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              : <Mail className="mr-2 h-4 w-4" />}
            {mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
          </Button>

          <div className="flex flex-col items-center gap-1 text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); setInfo(null); }}
            >
              {mode === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crea una'}
            </button>
            {mode === 'signin' && (
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={handleResetPassword}
              >
                He olvidado mi contraseña
              </button>
            )}
          </div>
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
