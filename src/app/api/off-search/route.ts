import { NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/verify-auth';

/**
 * Server-side proxy for Open Food Facts text search.
 *
 * Why a proxy: the modern search service (search.openfoodfacts.org) sends no
 * CORS headers, so browsers can't call it directly. On top of that, OFF
 * aggressively rate-limits/blocks anonymous and datacenter traffic, and its two
 * search back-ends (the modern "search-a-licious" and the legacy cgi/search.pl)
 * go down INDEPENDENTLY and often. So we try them in a fallback chain and use
 * whichever answers — maximising the chance a search works at all.
 *
 * Ranking bias: the modern service is queried Spain-first (products sold in
 * Spain rank on top), with a global top-up.
 *
 * If every back-end is unavailable we return 503; the client then steers the
 * user to the barcode scanner (the single-product API is far more reliable) or
 * to adding the food by hand.
 */

const ALICIOUS = 'https://search.openfoodfacts.org';
// Legacy cgi/search.pl lives on every country mirror; world + es fail at
// different moments, so try both.
const LEGACY_BASES = ['https://world.openfoodfacts.org', 'https://es.openfoodfacts.org'];
const FIELDS = 'code,product_name,product_name_es,brands,image_front_small_url,nutriments';
const USER_AGENT = 'Nutrilp/1.0 (alpha; jonicheik@gmail.com)';
// Fail a slow back-end fast so we can move on to the next one within the
// gateway's request budget.
const PER_FETCH_TIMEOUT_MS = 5000;

interface OffHit {
  code?: string;
  [key: string]: unknown;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
      // Cache identical queries briefly to ease OFF's rate limits.
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    // OFF sometimes serves an HTML "temporarily unavailable" page with a 200;
    // res.json() throws on that, which is exactly what we want (→ next back-end).
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Modern search service → hits[]. */
async function searchAlicious(query: string): Promise<OffHit[]> {
  const url =
    `${ALICIOUS}/search?q=${encodeURIComponent(query)}` +
    `&langs=es&page_size=20&fields=${FIELDS}`;
  const data = (await fetchJson(url)) as { hits?: OffHit[] };
  return data.hits ?? [];
}

/** Legacy cgi/search.pl → products[] (same field/nutriment names as hits). */
async function searchLegacy(base: string, query: string): Promise<OffHit[]> {
  const url =
    `${base}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
  const data = (await fetchJson(url)) as { products?: OffHit[] };
  return data.products ?? [];
}

export async function GET(request: Request) {
  // Requiere sesión (auditoría 2026-07-29): abierto, era un proxy que cualquiera
  // podía usar para lanzar peticiones salientes desde nuestro servidor. Además
  // de consumir recursos, Open Food Facts bloquea IPs de datacenter que abusan
  // (ver KNOWN_ISSUES) — un tercero podía dejar la búsqueda inservible.
  try {
    await verifyAuth(request);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ hits: [] });
  if (q.length > 100) {
    return NextResponse.json({ error: 'Consulta demasiado larga' }, { status: 400 });
  }

  let hits: OffHit[] = [];
  let anyBackendAnswered = false;

  // 1) Modern service — Spain-first, with a global top-up ONLY while it's alive.
  //    If the first call fails the service is down, so we don't hammer it again
  //    (that just doubles the wait before the legacy fallback).
  try {
    hits = await searchAlicious(`${q} countries_tags:"en:spain"`);
    anyBackendAnswered = true;
    if (hits.length < 20) {
      const seen = new Set(hits.map((h) => h.code));
      const global = await searchAlicious(q);
      hits = [...hits, ...global.filter((h) => !seen.has(h.code))].slice(0, 20);
    }
  } catch {
    /* modern service down — fall straight to legacy */
  }

  // 2) Legacy fallback — only needed when the modern service gave us nothing.
  if (hits.length === 0) {
    for (const base of LEGACY_BASES) {
      try {
        hits = await searchLegacy(base, q);
        anyBackendAnswered = true;
        if (hits.length > 0) break;
      } catch {
        /* try the next mirror */
      }
    }
  }

  // Every back-end errored → tell the client so it can steer to scan/manual.
  if (!anyBackendAnswered) {
    return NextResponse.json(
      { error: 'Open Food Facts no disponible', hits: [] },
      { status: 503 }
    );
  }

  return NextResponse.json({ hits });
}
