/**
 * Firma y verificación de JWT de sesión con `jose` (compatible con el edge
 * runtime → se puede usar en middleware). Lee JWT_SECRET de process.env
 * directamente para no arrastrar dependencias server-only al edge.
 */
import { SignJWT, jwtVerify } from 'jose';
import type { SessionUser } from './types';

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.trim() === '') {
    throw new Error('Falta la variable de entorno JWT_SECRET.');
  }
  return new TextEncoder().encode(s);
}

function getTtlSeconds(): number {
  const n = process.env.JWT_TTL_SECONDS ? Number(process.env.JWT_TTL_SECONDS) : 28800;
  return Number.isFinite(n) && n > 0 ? n : 28800;
}

export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: user.email, nom: user.nom, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + getTtlSeconds())
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.role !== 'string') return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      nom: String(payload.nom ?? ''),
      role: payload.role as SessionUser['role'],
    };
  } catch {
    return null;
  }
}

export function getSessionMaxAge(): number {
  return getTtlSeconds();
}
