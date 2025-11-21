'use client';
import { useState } from 'react';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, CheckCircle, UserPlus, Database, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useUser, signInWithGoogle, signOut, migrateInitialIngredients } from '@/firebase/auth/use-user';
import { useAuth, useFirestore, useFirebaseApp } from '@/firebase/provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';


interface PageHeaderProps {
  isGuest?: boolean;
  onRegisterClick?: () => void;
}

export function PageHeader({ isGuest = false, onRegisterClick }: PageHeaderProps) {
  const { user, claims, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const isAdmin = claims?.admin === true;
  const { toast } = useToast();
  
  const handleSignIn = async () => {
    if (auth && firestore) {
      await signInWithGoogle(auth, firestore);
    }
  };

  const handleSignOut = () => {
    if (auth) {
      signOut(auth);
    }
  };
  
  const handleMigration = async () => {
    if (!firestore || !user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo realizar la migración. Intenta iniciar sesión de nuevo.',
        });
        return;
    };
    try {
        const count = await migrateInitialIngredients(firestore, user.uid);
        toast({
            title: 'Migración completada',
            description: `${count} ingredientes nuevos han sido añadidos a la base de datos.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error en la migración',
            description: error.message || 'No se pudieron migrar los ingredientes.',
        });
    }
  };

  const renderUserAuth = () => {
    if (loading) {
      return <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />;
    }
    if (isGuest) {
      return (
        <Button onClick={onRegisterClick}>
          <UserPlus className="mr-2 h-4 w-4" />
          Crear Cuenta para Guardar
        </Button>
      );
    }
    if (user) {
       return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                  <AvatarFallback>
                    <UserIcon />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-glass" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={handleMigration} className="cursor-pointer">
                      <Database className="mr-2 h-4 w-4" />
                      <span>Migrar Ingredientes</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
              {isAdmin && firebaseApp && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Conectado a: <span className="font-semibold text-foreground">{firebaseApp.options.projectId}</span></span>
                  </DropdownMenuLabel>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
       );
    }
    // Default to sign-in button if no other state matches
    return (
        <Button onClick={handleSignIn}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 106.5 280.4 96 248 96c-84.3 0-152.3 67.8-152.3 152s68 152 152.3 152c92.8 0 140.3-61.5 143.8-92.6H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Iniciar Sesión
        </Button>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-glass">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground font-headline">
                NutriPlanner
              </span>
            </Link>
            <div className="flex items-center gap-4">
              {renderUserAuth()}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
