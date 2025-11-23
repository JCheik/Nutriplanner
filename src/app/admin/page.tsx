'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, BookOpen, Users, Wheat } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { user, claims, loading } = useUser();
  const router = useRouter();
  const isAdmin = claims?.admin === true || user?.email === 'jonicheik@gmail.com';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, router]);

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
                    <Link href="/admin/users" className="hover:shadow-lg transition-shadow rounded-lg">
                        <Card className="h-full cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Administrar Usuarios
                                </CardTitle>
                                <CardDescription>
                                    Ver, eliminar y cambiar roles de los usuarios de la plataforma.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-dashed">
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
                     <Card className="hover:shadow-lg transition-shadow cursor-pointer border-dashed">
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
