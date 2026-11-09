import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { encryptString } from '@/lib/crypto';
import { exchangeCode } from '@/lib/drive';
import { trobaUbicacio } from '@/lib/google-business';

// GET /api/ressenyes/google/callback — Google torna aquí: desem el refresh token
// (xifrat) i la fitxa de l'hostal. Si la API encara no està aprovada, ho diem.
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (url.searchParams.get('error') || !code) {
    return NextResponse.redirect(new URL('/ressenyes?google=error', req.url));
  }

  const est = await prisma.establiment.findFirst({ select: { id: true } });
  if (!est) return NextResponse.redirect(new URL('/ressenyes?google=error', req.url));

  try {
    const { refreshToken, accessToken } = await exchangeCode(code, `${url.origin}/api/ressenyes/google/callback`);
    if (!refreshToken) return NextResponse.redirect(new URL('/ressenyes?google=norefresh', req.url));

    // Desem el token encara que la fitxa no es pugui llegir (API pendent d'aprovació):
    // així, quan Google l'aprovi, la sincronització nocturna ja funcionarà sola.
    let location: string | null = null;
    let error: string | null = null;
    try {
      location = (await trobaUbicacio(accessToken)).location;
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 500) : 'No s’ha trobat la fitxa';
    }

    await prisma.establiment.update({
      where: { id: est.id },
      data: {
        googleBusinessTokenEnc: encryptString(refreshToken),
        googleBusinessLocation: location,
        ressenyesSyncError: error,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'establiment',
      entitatId: est.id,
      detall: { googleRessenyesConnectat: true, fitxa: location },
      ip: clientIp(req),
    });
    return NextResponse.redirect(new URL(`/ressenyes?google=${location ? 'ok' : 'pendent'}`, req.url));
  } catch {
    return NextResponse.redirect(new URL('/ressenyes?google=error', req.url));
  }
}

export const dynamic = 'force-dynamic';
