// Adaptado de la web (src/lib/open-food-facts.ts) — mantener el mapeo en
// sincronía. Solo búsqueda por nombre: el escáner de código de barras se
// retiró del producto (ver DECISIONS 2026-07-25). La búsqueda pasa por
// nuestro proxy porque Open Food Facts bloquea clientes anónimos/datacenter.

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://nutrilp.com').replace(/\/$/, '');

export interface OffProduct {
  barcode?: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  /** Nutrientes por 100 g (o 100 ml en bebidas — OFF normaliza ambos). */
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

interface OffApiProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
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
  let calories = num(n['energy-kcal_100g']);
  if (calories === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj !== undefined) calories = kj / 4.184;
  }
  // Un producto sin energía no sirve para contar macros.
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

/** Búsqueda por texto (ranking España primero) vía nuestro proxy. */
export async function searchOffProducts(query: string): Promise<OffProduct[]> {
  const res = await fetch(`${API_BASE}/api/off-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
  const data = (await res.json()) as { hits?: OffApiProduct[] };
  return (data.hits ?? []).map(mapProduct).filter((p): p is OffProduct => p !== null);
}
