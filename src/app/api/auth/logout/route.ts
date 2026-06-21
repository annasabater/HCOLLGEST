import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { SESSION_COOKIE } from '@/lib/auth/types';
import { audit } from '@/lib/audit';
import { clientIp } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (user) {
      await audit({
        usuariId: user.id,
        accio: 'LOGOUT',
        entitat: 'usuari',
        entitatId: user.id,
        ip: clientIp(req),
      });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
