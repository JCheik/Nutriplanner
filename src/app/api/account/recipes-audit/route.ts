import { NextResponse } from 'next/server';

import { initializeFirebase } from '@/firebase/server-init';
import type { Recipe } from '@/lib/types';
import { verifyAuth } from '@/lib/verify-auth';

/**
 * Tus recetas con su FECHA REAL de creación, para poder revisar las que la IA
 * se invento.
 *
 * Hasta el 2026-08-08, importar un enlace de Instagram o TikTok devolvía una
 * receta fabricada: el esquema de la IA obligaba a producir una y lo único que
 * llegaba del enlace era la palabra "Instagram" (esas plataformas no sirven el
 * contenido sin sesión). No es un caso hipotético, está en el historial.
 *
 * El problema para encontrarlas: **ni `sourceUrl` ni `createdAt` existían
 * entonces** (se añadieron el 17 y el 11 de agosto), así que esas recetas no
 * guardan de dónde salieron ni cuándo. Lo único que queda es el `createTime` del
 * propio documento de Firestore, que el Admin SDK sí expone y el SDK de cliente
 * no — de ahí que esto tenga que ser un endpoint y no una consulta desde la
 * página.
 *
 * Solo devuelve las recetas de QUIEN LLAMA: no hace falta ser admin, y así nadie
 * puede auditar las de otro.
 */
export async function GET(req: Request) {
  let uid: string;
  try {
    uid = await verifyAuth(req);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'No autorizado.' }, { status });
  }

  try {
    const { firestore } = initializeFirebase();
    const snap = await firestore.collection(`users/${uid}/recipes`).get();

    const recipes = snap.docs.map((d) => {
      const r = d.data() as Recipe;
      return {
        id: d.id,
        name: r.name ?? '(sin nombre)',
        servings: r.servings ?? 1,
        calories: Math.round(r.calories ?? 0),
        ingredientes: r.ingredients?.length ?? 0,
        sourceUrl: r.sourceUrl ?? null,
        // La fecha del propio documento: la única que existe para las viejas.
        creada: d.createTime?.toDate().toISOString() ?? null,
      };
    });

    recipes.sort((a, b) => (a.creada ?? '').localeCompare(b.creada ?? ''));
    return NextResponse.json({ total: recipes.length, recipes });
  } catch (e) {
    console.error('[recipes-audit]', e);
    return NextResponse.json({ error: 'No se pudieron leer tus recetas.' }, { status: 500 });
  }
}
