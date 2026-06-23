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

    // Protecció contra força bruta: bloqueig temporal després de 5 intents.
    const now = new Date();
    const MAX_INTENTS = 20;
    const LOCK_MIN = 15;
    if (user.lockedUntil && user.lockedUntil > now) {
      await audit({ usuariId: user.id, accio: 'ACCES', entitat: 'usuari', entitatId: user.id, detall: { bloquejat: true }, ip: clientIp(req) });
      return unauthorized('Massa intents fallits. Torna-ho a provar d’aquí uns minuts.');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const intents = (user.failedLogins ?? 0) + 1;
      const lock = intents >= MAX_INTENTS ? new Date(now.getTime() + LOCK_MIN * 60_000) : null;
      await prisma.usuari.update({
        where: { id: user.id },
        data: { failedLogins: lock ? 0 : intents, lockedUntil: lock },
      });
      return unauthorized(
        lock ? 'Massa intents fallits. Compte bloquejat 15 minuts.' : 'Credencials incorrectes',
      );
    }

    // Login correcte → reinicia el comptador d'intents.
    if (user.failedLogins > 0 || user.lockedUntil) {
      await prisma.usuari.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }

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
