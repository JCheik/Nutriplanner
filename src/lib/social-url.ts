import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * Lectura de una página (red social o web de recetas) para importar recetas.
 * Extraído de `/api/fetch-social-url` para que también lo use
 * `/api/ai/import-recipe`, el que llama la app nativa. **Una sola copia a
 * propósito**: aquí viven las protecciones contra SSRF y no deben divergir
 * entre los dos caminos.
 *
 * Hasta 2026-08-03 esto tenía una lista blanca de ocho dominios sociales, que
 * era la ÚNICA protección. Al abrirlo a cualquier web de recetas hubo que
 * sustituirla por defensa real, porque esto corre en Cloud Run y ahí
 * 169.254.169.254 reparte tokens de la cuenta de servicio: un SSRF no se lleva
 * una receta, se lleva las credenciales del proyecto.
 */

/** Redirecciones que se siguen antes de rendirse. */
const MAX_REDIRECTS = 4;
/** Tope de HTML a leer: sin esto, una respuesta enorme agota la memoria. */
const MAX_HTML_BYTES = 2 * 1024 * 1024;

/**
 * ¿Es una IP que no debe alcanzarse desde el servidor? Cubre loopback, redes
 * privadas, link-local (donde vive el servidor de metadatos de la nube),
 * CGNAT y los rangos reservados.
 */
export function isBlockedIp(ip: string): boolean {
  const v = net.isIP(ip);

  if (v === 4) {
    const p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + metadatos de la nube
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast y reservados
    return false;
  }

  if (v === 6) {
    const h = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (h === '::' || h === '::1') return true;
    if (h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return true; // link-local + ULA
    // IPv4 embebida (::ffff:169.254.169.254) — se valida la parte v4.
    const embedded = h.match(/(\d+\.\d+\.\d+\.\d+)$/);
    if (embedded) return isBlockedIp(embedded[1]);
    return false;
  }

  return true; // no es una IP: no se deja pasar
}

/**
 * Comprueba a qué resuelve el host ANTES de pedirlo. Mirar solo el texto del
 * dominio no vale: `recetas-malas.com` puede apuntar a 169.254.169.254 y el
 * nombre no delata nada.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) {
    throw new SocialUrlError('Ese enlace apunta a una dirección interna.', 400);
  }

  // Si ya es una IP literal se valida directamente, sin resolver.
  if (net.isIP(h)) {
    if (isBlockedIp(h)) throw new SocialUrlError('Ese enlace apunta a una dirección interna.', 400);
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(h, { all: true });
  } catch {
    throw new SocialUrlError('No se pudo resolver ese dominio.', 400);
  }
  if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
    throw new SocialUrlError('Ese enlace apunta a una dirección interna.', 400);
  }
}

/**
 * `fetch` siguiendo redirecciones A MANO, validando cada salto. Con el
 * seguimiento automático, una URL pública puede rebotar a la red interna y la
 * comprobación inicial no sirve de nada.
 */
async function safeFetch(url: string, init: RequestInit & { timeoutMs: number }): Promise<Response> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'https:') {
      throw new SocialUrlError('Solo se permiten URLs HTTPS', 400);
    }
    await assertPublicHost(parsed.hostname);

    const res = await fetch(current, {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(init.timeoutMs),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }

  throw new SocialUrlError('Demasiadas redirecciones.', 502);
}

/** Lee el cuerpo con tope de tamaño, para no tragarse una respuesta enorme. */
async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\n/g, '\n');
}

function extractMeta(html: string, property: string): string | null {
  const regexes = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const re of regexes) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return null;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Descarga la imagen del post en el servidor (sin CORS) y la devuelve como data
 * URL para que el cliente pueda re-alojarla. Las URLs de CDN de estos posts
 * caducan y bloquean el hotlinking, así que guardar la URL cruda se rompería.
 * Best-effort: si algo falla, se omite la imagen y la importación sigue.
 */
export async function fetchImageAsDataUrl(rawUrl: string): Promise<string | null> {
  try {
    // Pasa por safeFetch como todo lo demás: la og:image la elige la página, así
    // que es una URL de un tercero tanto como la propia página.
    const res = await safeFetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
      timeoutMs: 8000,
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await readCapped(res, MAX_IMAGE_BYTES);
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Tope del vídeo que se descarga para analizarlo. Un reel o un TikTok típico no
 * pasa de 10–15 MB; por encima de esto casi seguro es otra cosa, y bajarlo
 * entero se comería el tiempo de la petición.
 */
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

/**
 * Descarga el vídeo del post en el servidor.
 *
 * Hace falta porque **Gemini NO acepta una URL de vídeo cualquiera**: responde
 * `400 Unsupported url` a todo lo que no sea YouTube. Comprobado. Durante meses
 * el importador se la pasaba tal cual y el análisis fallaba SIEMPRE en Instagram
 * y TikTok, cayendo mudamente al pie de foto — por eso las recetas que solo se
 * cuentan en el vídeo nunca se importaban. El vídeo hay que subirlo a la Files
 * API, y para subirlo primero hay que tenerlo.
 *
 * Pasa por `safeFetch` como todo lo demás: la URL sale del HTML de un tercero.
 */
export async function fetchVideoBytes(
  rawUrl: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const res = await safeFetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'video/*' },
      timeoutMs: 20000,
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || 'video/mp4').split(';')[0];
    if (!contentType.startsWith('video/')) return null;

    const bytes = await readCapped(res, MAX_VIDEO_BYTES);
    // `readCapped` corta al llegar al tope, así que un vídeo más grande llegaría
    // truncado y sin cabecera de cierre. Mejor descartarlo que analizar basura.
    if (bytes.length === 0 || bytes.length >= MAX_VIDEO_BYTES) return null;

    return { bytes, contentType };
  } catch {
    return null;
  }
}

export interface SocialMetadata {
  title: string | null;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  /**
   * La receta ya estructurada, si la página la publica en JSON-LD. Casi todas
   * las webs de recetas lo hacen, y es MUCHO mejor que las etiquetas Open
   * Graph: trae ingredientes y pasos de verdad en vez de un resumen.
   */
  recipeText: string | null;
}

/** Aplana los arrays y los `@graph` con los que cada CMS envuelve el JSON-LD. */
function flattenJsonLd(node: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    node.forEach((n) => flattenJsonLd(n, out));
  } else if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    out.push(obj);
    if (obj['@graph']) flattenJsonLd(obj['@graph'], out);
  }
  return out;
}

function isRecipeNode(obj: Record<string, unknown>): boolean {
  const t = obj['@type'];
  if (typeof t === 'string') return t.toLowerCase() === 'recipe';
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && x.toLowerCase() === 'recipe');
  return false;
}

/** Los pasos vienen como texto suelto, como objetos HowToStep o como secciones. */
function stepsToText(instructions: unknown): string[] {
  if (typeof instructions === 'string') return [instructions];
  if (!Array.isArray(instructions)) return [];
  const out: string[] = [];
  for (const step of instructions) {
    if (typeof step === 'string') {
      out.push(step);
    } else if (step && typeof step === 'object') {
      const s = step as Record<string, unknown>;
      if (typeof s.text === 'string') out.push(s.text);
      else if (Array.isArray(s.itemListElement)) out.push(...stepsToText(s.itemListElement));
      else if (typeof s.name === 'string') out.push(s.name);
    }
  }
  return out;
}

/**
 * Saca la receta del JSON-LD y la deja como texto plano ordenado, que es lo que
 * el flow de importación sabe masticar. No se mapea campo a campo a propósito:
 * la IA sigue haciendo falta para normalizar cantidades y casar ingredientes
 * con el catálogo, y así hay un solo camino de importación que mantener.
 */
export function extractRecipeFromJsonLd(html: string): string | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const [, raw] of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      continue; // JSON-LD roto: se ignora ese bloque, no la página entera
    }

    const recipe = flattenJsonLd(parsed).find(isRecipeNode);
    if (!recipe) continue;

    const lines: string[] = [];
    if (typeof recipe.name === 'string') lines.push(recipe.name);
    if (typeof recipe.description === 'string') lines.push(recipe.description);
    if (recipe.recipeYield) lines.push(`Raciones: ${String(recipe.recipeYield)}`);

    const ingredients = recipe.recipeIngredient ?? recipe.ingredients;
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      lines.push('', 'Ingredientes:');
      ingredients.forEach((i) => typeof i === 'string' && lines.push(`- ${i}`));
    }

    const steps = stepsToText(recipe.recipeInstructions);
    if (steps.length > 0) {
      lines.push('', 'Preparación:');
      steps.forEach((s, i) => lines.push(`${i + 1}. ${s.replace(/\s+/g, ' ').trim()}`));
    }

    const text = decodeEntities(lines.join('\n')).trim();
    // Sin ingredientes no aporta nada sobre las etiquetas Open Graph.
    if (Array.isArray(ingredients) && ingredients.length > 0 && text.length > 0) return text;
  }

  return null;
}

export class SocialUrlError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Descarga la página y saca sus metadatos: Open Graph y, si la publica, la
 * receta en JSON-LD.
 *
 * Acepta CUALQUIER dominio público — la protección no es una lista de nombres
 * sino `safeFetch`, que valida la IP a la que resuelve cada salto.
 *
 * @throws {SocialUrlError} si la URL no es válida, no es HTTPS, apunta a una
 * dirección interna o la página no responde.
 */
export async function fetchSocialMetadata(url: string): Promise<SocialMetadata> {
  if (!url || typeof url !== 'string') {
    throw new SocialUrlError('URL inválida', 400);
  }

  try {
    new URL(url);
  } catch {
    throw new SocialUrlError('URL inválida', 400);
  }

  const res = await safeFetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    timeoutMs: 12000,
  });

  if (!res.ok) {
    throw new SocialUrlError(`HTTP ${res.status}`, 502);
  }

  const html = (await readCapped(res, MAX_HTML_BYTES)).toString('utf8');

  return {
    recipeText: extractRecipeFromJsonLd(html),
    title:
      extractMeta(html, 'og:title') ||
      extractMeta(html, 'twitter:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null,
    description:
      extractMeta(html, 'og:description') ||
      extractMeta(html, 'twitter:description') ||
      extractMeta(html, 'description') ||
      null,
    videoUrl:
      extractMeta(html, 'og:video:secure_url') ||
      extractMeta(html, 'og:video:url') ||
      extractMeta(html, 'og:video') ||
      null,
    imageUrl: extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || null,
  };
}
