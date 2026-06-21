import { getSessionUser } from '@/lib/auth/session';
import { ok, unauthorized } from '@/lib/http';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return ok({ user });
}

export const dynamic = 'force-dynamic';
