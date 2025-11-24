'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminIngredientsPage() {

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Base de Datos de Ingredientes</CardTitle>
                            <CardDescription>
                                La base de datos global de ingredientes se gestiona directamente al crear o editar recetas para asegurar la consistencia.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <p className="text-muted-foreground">Actualmente, no hay acciones masivas disponibles para esta sección.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
