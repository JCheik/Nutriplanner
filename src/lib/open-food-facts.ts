/**
 * Thin client for Open Food Facts (no key required), mapping products to the
 * app's per-100g macro shape.
 *
 * Endpoints:
 * - Text search: goes through OUR /api/off-search proxy. The Search-a-licious
 *   service has no CORS headers, so a direct browser fetch is blocked; the
 *   proxy also ranks products sold in Spain first.
 * - Barcode: the v2 product API directly (it does send CORS headers).
 * Searches only fire on explicit submit, never per keystroke (OFF rate limits).
 */

export interface OffProduct {
  /** EAN/UPC barcode, when known. */
  barcode?: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  /** Nutriments per 100 g (or 100 ml for drinks — OFF normalises both). */
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

const PRODUCT_BASE = 'https://world.openfoodfacts.org';

const FIELDS = 'code,product_name,product_name_es,brands,image_front_small_url,nutriments';

interface OffApiProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  /** String in the v2 product API, array in Search-a-licious hits. */
  brands?: string | string[];
  image_front_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: number | string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function firstBrand(brands: string | string[] | undefined): string | undefined {
  if (!brands) return undefined;
  const first = Array.isArray(brands) ? brands[0] : brands.split(',')[0];
  return first?.trim() || undefined;
}

function mapProduct(p: OffApiProduct): OffProduct | null {
  const name = (p.product_name_es || p.product_name || '').trim();
  if (!name) return null;

  const n = p.nutriments ?? {};
  // Prefer kcal directly; fall back to kJ → kcal (both spellings exist).
  let calories = num(n['energy-kcal_100g']);
  if (calories === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj !== undefined) calories = kj / 4.184;
  }
  // A product without energy data is useless for macro tracking.
  if (calories === undefined) return null;

  return {
    barcode: p.code,
    name,
    brand: firstBrand(p.brands),
    imageUrl: p.image_front_small_url || undefined,
    per100g: {
      calories: Math.round(calories * 10) / 10,
      protein: num(n['proteins_100g']) ?? 0,
      carbs: num(n['carbohydrates_100g']) ?? 0,
      fat: num(n['fat_100g']) ?? 0,
      fiber: num(n['fiber_100g']) ?? 0,
    },
  };
}

/** Text search (Spain-first ranking, via our proxy). Returns up to 20 products with usable nutrition data. */
export async function searchOffProducts(query: string): Promise<OffProduct[]> {
  // El proxy exige sesión (ver la ruta): se manda el ID token del usuario.
  const { getAuth } = await import('firebase/auth');
  const token = await getAuth().currentUser?.getIdToken();
  const res = await fetch(`/api/off-search?q=${encodeURIComponent(query)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
  const data = (await res.json()) as { hits?: OffApiProduct[] };
  return (data.hits ?? [])
    .map(mapProduct)
    .filter((p): p is OffProduct => p !== null);
}

/** Barcode lookup. Returns null when the product isn't in the database. */
export async function getOffProductByBarcode(barcode: string): Promise<OffProduct | null> {
  const clean = barcode.replace(/\D/g, '');
  if (!clean) return null;
  const res = await fetch(`${PRODUCT_BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: OffApiProduct };
  if (!data.product) return null;
  return mapProduct(data.product);
}
