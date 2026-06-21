/**
 * Acceso a la sesión actual desde Server Components y Route Handlers.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { verifySessionToken } from './jwt';
import { SESSION_COOKIE, type SessionUser } from './types';

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
