import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, getSessionMaxAge } from '@/lib/auth/jwt';
import { SESSION_COOKIE } from '@/lib/auth/types';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok, unauthorized } from '@/lib/http';
import { clientIp } from '@/lib/auth/guard';
import { NextResponse } from 'next/server';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return badRequest('Credencials no vàlides');

    const { email, password } = parsed.data;
    const user = await prisma.usuari.findUnique({ where: { email: email.toLowerCase() } });

    // Mensaje genérico para no filtrar si el email existe.
    if (!user || !user.actiu) return unauthorized('Credencials incorrectes');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return unauthorized('Credencials incorrectes');

    const sessionUser = { id: user.id, email: user.email, nom: user.nom, role: user.role };
    const token = await signSession(sessionUser);

    await audit({
      usuariId: user.id,
      accio: 'LOGIN',
      entitat: 'usuari',
      entitatId: user.id,
      ip: clientIp(req),
    });

    const res = NextResponse.json({ user: sessionUser });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getSessionMaxAge(),
    });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

// Evita respuestas cacheadas.
export const dynamic = 'force-dynamic';
// Mantén ok() importado por consistencia con el resto de handlers.
void ok;
