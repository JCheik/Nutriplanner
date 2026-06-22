import { NextRequest, NextResponse } from 'next/server';

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
    const { url } = await req.json() as { url: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL inválida' }, { status: 400 });
    }

    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ success: false, error: 'Protocolo no permitido' }, { status: 400 });
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
    const msg = err instanceof Error ? err.message : 'Error al acceder a la URL';
    return NextResponse.json({ success: false, error: msg });
  }
}
