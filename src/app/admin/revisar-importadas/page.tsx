'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

import { useFirestore, useUser } from '@/firebase';
import { deleteRecipeById } from '@/firebase/firestore-operations';
import { Button } from '@/components/ui/button';

/**
 * Revisar las recetas que la IA pudo inventarse.
 *
 * Hasta el 2026-08-08, importar un enlace de Instagram o TikTok producía una
 * receta FABRICADA: el esquema obligaba a devolver una y del enlace solo llegaba
 * la palabra "Instagram". Esas recetas están en el recetario mezcladas con las
 * buenas y no se distinguen por dentro — `sourceUrl` y `createdAt` no existían
 * entonces.
 *
 * Lo único que queda es la fecha real del documento, que viene del endpoint.
 * Así que esto NO adivina cuáles son: enseña las anteriores al corte para que la
 * persona reconozca las que importó de un reel. La decisión es suya, y por eso
 * cada fila se borra por separado.
 */

/** Cuando se tapó el agujero (commit e40641d). Antes de esto, sospechosas. */
const CORTE = '2026-08-08';

interface Fila {
  id: string;
  name: string;
  servings: number;
  calories: number;
  ingredientes: number;
  sourceUrl: string | null;
  creada: string | null;
}

export default function RevisarImportadasPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/recipes-audit', {
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudieron leer las recetas.');
      setFilas(json.recipes as Fila[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo falló.');
    }
  }, [user]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const { sospechosas, resto } = useMemo(() => {
    const todas = filas ?? [];
    // Sin fecha = anterior a que Firestore la registrara para nosotros: entra
    // igualmente en el grupo a revisar, que es lo prudente.
    const antes = (f: Fila) => !f.creada || f.creada.slice(0, 10) < CORTE;
    return { sospechosas: todas.filter(antes), resto: todas.filter((f) => !antes(f)) };
  }, [filas]);

  const borrar = async (id: string) => {
    if (!user || !firestore) return;
    setBorrando(id);
    try {
      await deleteRecipeById(firestore, user.uid, id, false);
      setFilas((prev) => (prev ?? []).filter((f) => f.id !== id));
    } catch {
      setError('No se pudo borrar esa receta.');
    } finally {
      setBorrando(null);
    }
  };

  if (userLoading) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  if (!user) return <div className="p-8 text-sm text-muted-foreground">Inicia sesión.</div>;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold font-headline">Revisar recetas importadas</h1>
        <p className="text-sm text-muted-foreground">
          Hasta el <strong>8 de agosto de 2026</strong>, importar un enlace de Instagram o TikTok
          devolvía una receta <strong>inventada</strong>: esas plataformas no dejan leer sus
          publicaciones desde fuera, y la IA estaba obligada a devolver una receta igualmente.
        </p>
        <p className="text-sm text-muted-foreground">
          No puedo señalarte cuáles son —esas recetas no guardaron de dónde salían—, así que aquí
          tienes <strong>las anteriores a esa fecha</strong>. Reconoce las que importaste de un reel
          y bórralas. Las de webs de recetas y YouTube <strong>sí</strong> son buenas: de esas dos
          fuentes el contenido sí se leía.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {filas === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Leyendo tus recetas…
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              A revisar · {sospechosas.length}
            </h2>
            {sospechosas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguna receta tuya es anterior al corte. No hay nada que revisar.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {sospechosas.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.creada ? new Date(f.creada).toLocaleDateString('es-ES') : 'sin fecha'} ·{' '}
                        {f.ingredientes} ingredientes · {f.calories} kcal · rinde {f.servings}
                        {f.sourceUrl ? (
                          <>
                            {' · '}
                            <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                              origen
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => borrar(f.id)}
                      disabled={borrando === f.id}
                      aria-label={`Borrar ${f.name}`}
                    >
                      {borrando === f.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Posteriores al corte (no afectadas): {resto.length}
          </p>
        </>
      )}
    </div>
  );
}
