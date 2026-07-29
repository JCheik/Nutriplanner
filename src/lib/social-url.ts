/**
 * Lectura de una publicación de redes sociales para importar recetas. Extraído
 * de `/api/fetch-social-url` para que también lo use `/api/ai/import-recipe`
 * (el que llama la app nativa cuando compartes un enlace desde Instagram o
 * TikTok). **Una sola copia a propósito**: aquí viven las protecciones contra
 * SSRF y no deben divergir entre los dos caminos.
 */

// Dominios que este proxy puede pedir. Evita usarlo contra servicios internos.
const ALLOWED_DOMAINS = new Set([
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'facebook.com',
  'pinterest.com',
]);

export const ALLOWED_DOMAINS_LABEL = 'Instagram, TikTok, YouTube, Twitter/X, Facebook, Pinterest';

export function isAllowedDomain(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  // Coincidencia exacta o subdominio (p. ej. vm.tiktok.com)
  return (
    ALLOWED_DOMAINS.has(normalized) ||
    [...ALLOWED_DOMAINS].some((d) => normalized.endsWith(`.${d}`))
  );
}

/**
 * Bloquea hosts privados / de metadatos para que la descarga de la imagen no se
 * pueda usar como SSRF (una página podría apuntar su og:image a una IP interna).
 */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === '::1' || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
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
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:' || isPrivateHost(u.hostname)) return null;

    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export interface SocialMetadata {
  title: string | null;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
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
 * Descarga la página y saca sus metadatos Open Graph.
 * @throws {SocialUrlError} si la URL no es válida, no es HTTPS, el dominio no
 * está permitido o la página no responde.
 */
export async function fetchSocialMetadata(url: string): Promise<SocialMetadata> {
  if (!url || typeof url !== 'string') {
    throw new SocialUrlError('URL inválida', 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SocialUrlError('URL inválida', 400);
  }

  if (parsed.protocol !== 'https:') {
    throw new SocialUrlError('Solo se permiten URLs HTTPS', 400);
  }
  if (!isAllowedDomain(parsed.hostname)) {
    throw new SocialUrlError(`Dominio no permitido. Dominios aceptados: ${ALLOWED_DOMAINS_LABEL}.`, 403);
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new SocialUrlError(`HTTP ${res.status}`, 502);
  }

  const html = await res.text();

  return {
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
