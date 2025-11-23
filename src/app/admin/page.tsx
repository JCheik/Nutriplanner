'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, BookOpen, Users, Wheat } from 'lucide-react';

export default function AdminPage() {
  const { user, claims, loading } = useUser();
  const router = useRouter();
  const isAdmin = claims?.admin === true || user?.email === 'jonicheik@gmail.com';

  useEffect(() => {
    // If loading is finished and user is not an admin, redirect them.
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, router]);

  // While loading, show a placeholder to prevent flicker
  if (loading || !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center">
            <p>Verificando permisos...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
        <PageHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold font-headline">Panel de Administración</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Recetas Globales
                            </CardTitle>
                            <CardDescription>
                                Gestionar las recetas de NutriPlanner y sus carpetas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Próximamente...</p>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Recetas de la Comunidad
                            </CardTitle>
                            <CardDescription>
                                Moderar y gestionar las recetas compartidas por los usuarios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Próximamente...</p>
                        </CardContent>
                    </Card>
                     <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wheat className="h-5 w-5" />
                                Base de Datos de Ingredientes
                            </CardTitle>
                            <CardDescription>
                                Limpiar, unificar y gestionar la base de datos de ingredientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Próximamente...</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    </div>
  );
}
