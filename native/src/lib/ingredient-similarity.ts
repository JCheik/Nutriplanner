// Copiado de la web (src/lib/ingredient-similarity.ts) — mantener en sincronía hasta que exista un paquete compartido.
import { normalizeText } from './utils';
import type { BaseIngredient } from './types';

/**
 * Duplicate-ingredient detection ("clara de huevo" vs "claras de huevo").
 *
 * `singularKey` folds naive Spanish plurals word by word so variants collapse to
 * the same key; `findSimilarIngredient` adds a small edit-distance net on top
 * for typos/near-variants. This is DETECTION only — it never changes an
 * ingredient's identity (that stays `ingredientKey`, exact name+brand): callers
 * use it to *suggest* an existing food before creating a new one, and to group
 * suspected duplicates in the admin tool.
 */

const VOWELS = 'aeiou';

// "claras"→"clara", "tomates"→"tomate", "calabacines"→"calabacine" (close
// enough for the edit-distance net), "lombrices"→"lombriz".
function foldWord(w: string): string {
  if (w.length >= 4 && w.endsWith('s') && VOWELS.includes(w[w.length - 2])) return w.slice(0, -1);
  if (w.length >= 5 && w.endsWith('ces')) return w.slice(0, -3) + 'z';
  if (w.length >= 5 && w.endsWith('es')) return w.slice(0, -2);
  return w;
}

/** Normalized, plural-folded key used to group/compare ingredient names. */
export function singularKey(name: string): string {
  return normalizeText(name)
    .split(/\s+/)
    .filter(Boolean)
    .map(foldWord)
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Finds an existing ingredient that is probably the same food as `name`:
 * same plural-folded key, or within edit distance 2 (long-enough names only,
 * so "sal" never matches "col"). Returns undefined when nothing is close.
 */
export function findSimilarIngredient(
  name: string,
  db: BaseIngredient[]
): BaseIngredient | undefined {
  const key = singularKey(name);
  if (!key) return undefined;

  let best: BaseIngredient | undefined;
  let bestDist = Infinity;

  for (const ing of db) {
    const candidateKey = singularKey(ing.name);
    if (candidateKey === key) return ing;
    if (Math.max(candidateKey.length, key.length) < 6) continue;
    // Cheap length pre-filter before the O(n·m) distance.
    if (Math.abs(candidateKey.length - key.length) > 2) continue;
    const dist = levenshtein(candidateKey, key);
    if (dist <= 2 && dist < bestDist) {
      best = ing;
      bestDist = dist;
    }
  }
  return best;
}
