import { NextResponse } from 'next/server';

/**
 * Server-side proxy for Open Food Facts text search.
 *
 * Needed because the Search-a-licious service (search.openfoodfacts.org) does
 * NOT send CORS headers, so browsers block direct fetches from the app. The
 * barcode product API does allow CORS and stays client-side.
 *
 * Bonus: results are Spain-first — a filtered query runs first (Spanish
 * supermarket brands rank on top) and the global search fills the remainder.
 */

const SEARCH_BASE = 'https://search.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_es,brands,image_front_small_url,nutriments';
const USER_AGENT = 'Nutrilp/1.0 (alpha; jonicheik@gmail.com)';

interface OffHit {
  code?: string;
  [key: string]: unknown;
}

async function searchOff(query: string): Promise<OffHit[]> {
  const url =
    `${SEARCH_BASE}/search?q=${encodeURIComponent(query)}` +
    `&langs=es&page_size=20&fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    // Cache identical queries briefly to be gentle with OFF's rate limits.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
  const data = (await res.json()) as { hits?: OffHit[] };
  return data.hits ?? [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ hits: [] });
  if (q.length > 100) {
    return NextResponse.json({ error: 'Consulta demasiado larga' }, { status: 400 });
  }

  try {
    // Spain-first ranking; if the filtered query errors or comes back thin,
    // top up with global results (deduped by barcode).
    let hits: OffHit[] = [];
    try {
      hits = await searchOff(`${q} countries_tags:"en:spain"`);
    } catch {
      /* filter failed — the global query below still serves the request */
    }
    if (hits.length < 20) {
      const seen = new Set(hits.map((h) => h.code));
      const global = await searchOff(q);
      hits = [...hits, ...global.filter((h) => !seen.has(h.code))].slice(0, 20);
    }
    return NextResponse.json({ hits });
  } catch (e) {
    console.error('off-search proxy failed:', e);
    return NextResponse.json({ error: 'Open Food Facts no responde' }, { status: 502 });
  }
}
