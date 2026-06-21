/**
 * Guardas de autorización para Route Handlers.
 *
 *   const auth = await authorize(ROLES_WRITE);
 *   if (auth instanceof NextResponse) return auth; // 401/403
 *   const user = auth; // SessionUser
 */
import 'server-only';
import { NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { getSessionUser } from './session';
import { hasRole, ROLES_ALL } from './rbac';
import { forbidden, unauthorized } from '../http';
import type { SessionUser } from './types';

export async function authorize(allowed: Role[] = ROLES_ALL): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!hasRole(user.role, allowed)) return forbidden();
  return user;
}

/** IP del cliente para auditoría (best-effort tras proxy). */
export function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return req.headers.get('x-real-ip');
}
