/**
 * Endpoint PÚBLIC (sense auth, només lectura) per a hostalcoll.com: les
 * ressenyes de Google PUBLICADES a /ressenyes, en ordre, més el resum real de
 * la fitxa de Google (nota, total, enllaç) que la web ha de mostrar sempre.
 * El middleware deixa passar /api/public/*.
 */
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/http';
import { ressenyesPubliques } from '@/lib/services/ressenyes';

const ORIGENS = new Set(['https://hostalcoll.com', 'https://www.hostalcoll.com']);

function withCors(req: Request, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin');
  res.headers.set('Access-Control-Allow-Origin', origin && ORIGENS.has(origin) ? origin : 'https://hostalcoll.com');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Vary', 'Origin');
  return res;
}

export function OPTIONS(req: Request) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

// GET /api/public/ressenyes
export async function GET(req: Request) {
  try {
    const res = NextResponse.json(await ressenyesPubliques());
    // Caché curta a la CDN: un canvi a /ressenyes es veu a la web en ≤ 5 min.
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return withCors(req, res);
  } catch (err) {
    return withCors(req, handleApiError(err));
  }
}

export const dynamic = 'force-dynamic';
