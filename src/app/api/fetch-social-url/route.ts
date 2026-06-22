import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/verify-auth';

// Domains this proxy is allowed to fetch. Prevents SSRF against internal services.
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

function isAllowedDomain(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  // Exact match or subdomain (e.g. vm.tiktok.com)
  return (
    ALLOWED_DOMAINS.has(normalized) ||
    [...ALLOWED_DOMAINS].some((d) => normalized.endsWith(`.${d}`))
  );
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

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\n/g, '\n');
}

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { url } = await req.json() as { url: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL inválida' }, { status: 400 });
    }

    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ success: false, error: 'Solo se permiten URLs HTTPS' }, { status: 400 });
    }

    if (!isAllowedDomain(parsed.hostname)) {
      return NextResponse.json(
        {
          success: false,
          error: `Dominio no permitido. Dominios aceptados: Instagram, TikTok, YouTube, Twitter/X, Facebook, Pinterest.`,
        },
        { status: 403 }
      );
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
      return NextResponse.json({ success: false, error: `HTTP ${res.status}` });
    }

    const html = await res.text();

    const title =
      extractMeta(html, 'og:title') ||
      extractMeta(html, 'twitter:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;

    const description =
      extractMeta(html, 'og:description') ||
      extractMeta(html, 'twitter:description') ||
      extractMeta(html, 'description') ||
      null;

    const videoUrl =
      extractMeta(html, 'og:video:secure_url') ||
      extractMeta(html, 'og:video:url') ||
      extractMeta(html, 'og:video') ||
      null;

    const imageUrl =
      extractMeta(html, 'og:image') ||
      extractMeta(html, 'twitter:image') ||
      null;

    return NextResponse.json({ success: true, title, description, videoUrl, imageUrl });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 401) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : 'Error al acceder a la URL';
    return NextResponse.json({ success: false, error: msg });
  }
}
