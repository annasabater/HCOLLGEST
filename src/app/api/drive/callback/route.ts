import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { encryptString } from '@/lib/crypto';
import { exchangeCode } from '@/lib/drive';

const ESTABLIMENT_ID = 'hostal-coll';

// GET /api/drive/callback — Google torna aquí amb el codi; desem el refresh token.
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');
  if (err || !code) return NextResponse.redirect(new URL('/config?drive=error', req.url));

  try {
    const redirectUri = `${url.origin}/api/drive/callback`;
    const { refreshToken } = await exchangeCode(code, redirectUri);
    // Sense refresh token no podem renovar l'accés des del cron (cal re-autoritzar
    // amb prompt=consent, que ja fem; si falta, Google no l'ha tornat).
    if (!refreshToken) return NextResponse.redirect(new URL('/config?drive=norefresh', req.url));

    await prisma.establiment.update({
      where: { id: ESTABLIMENT_ID },
      data: { driveRefreshTokenEnc: encryptString(refreshToken) },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'establiment',
      entitatId: ESTABLIMENT_ID,
      detall: { driveConnectat: true },
      ip: clientIp(req),
    });
    return NextResponse.redirect(new URL('/config?drive=ok', req.url));
  } catch {
    return NextResponse.redirect(new URL('/config?drive=error', req.url));
  }
}

export const dynamic = 'force-dynamic';
