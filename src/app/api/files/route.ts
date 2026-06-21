import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, notFound } from '@/lib/http';
import { readUpload, mimeForPath } from '@/lib/storage';

// GET /api/files?path=uploads/xxx — sirve un adjunto (autorizado y auditado)
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const rel = new URL(req.url).searchParams.get('path');
    if (!rel) return badRequest('Cal el paràmetre path');

    let buffer: Buffer;
    try {
      buffer = await readUpload(rel);
    } catch {
      return notFound();
    }

    await audit({
      usuariId: auth.id,
      accio: 'DESCARREGA',
      entitat: 'fitxer',
      detall: { path: rel },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeForPath(rel),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
