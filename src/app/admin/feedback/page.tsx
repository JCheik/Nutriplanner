'use client';

import { collection, doc, orderBy, query, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Check, Inbox, RotateCcw, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { FeedbackEntry } from '@/lib/types';

/**
 * Buzón de reportes de los testers. Lo que mandan desde la app en Perfil →
 * "Contar un problema" aterriza aquí, con la versión y el móvil ya adjuntos.
 *
 * Solo lo ve el admin: las reglas de Firestore permiten crear a cualquiera
 * logueado, pero leer y listar solo a admin (el guard de `/admin/layout.tsx` es
 * la capa de UX; la de verdad son las reglas).
 */
export default function AdminFeedbackPage() {
  const firestore = useFirestore();
  const [showHandled, setShowHandled] = useState(false);

  const feedbackQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'feedback'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data, isLoading: loading } = useCollection<FeedbackEntry>(feedbackQuery);

  const entries = useMemo(() => (data ?? []).filter((f) => showHandled || !f.handled), [data, showHandled]);
  const pending = useMemo(() => (data ?? []).filter((f) => !f.handled).length, [data]);

  const toggleHandled = async (entry: FeedbackEntry) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'feedback', entry.id), { handled: !entry.handled }).catch(() => {});
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-screen-lg flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Inbox className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-headline text-3xl font-bold">Reportes</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Cargando…' : pending === 0 ? 'Nada pendiente.' : `${pending} sin revisar.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHandled((v) => !v)}>
              {showHandled ? 'Ocultar revisados' : 'Ver revisados'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" /> Panel
              </Link>
            </Button>
          </div>
        </div>

        {!loading && entries.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {showHandled ? 'No hay reportes.' : 'Ningún reporte pendiente.'}
            </CardContent>
          </Card>
        ) : null}

        {entries.map((f) => (
          <Card key={f.id} className={f.handled ? 'opacity-60' : undefined}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{f.name || f.email || 'Alguien'}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {f.email}
                    {f.email && ' · '}
                    {new Date(f.createdAt).toLocaleString('es-ES')}
                  </p>
                </div>
                <Button variant={f.handled ? 'ghost' : 'default'} size="sm" onClick={() => toggleHandled(f)}>
                  {f.handled ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" /> Reabrir
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Revisado
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{f.message}</p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  {f.device || 'dispositivo desconocido'}
                </span>
                <span>app {f.appVersion || '—'}</span>
                {f.screen ? <span>pantalla: {f.screen}</span> : null}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
