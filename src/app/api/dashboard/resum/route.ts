import { authorize } from '@/lib/auth/guard';
import { ok } from '@/lib/http';
import { getResum } from '@/lib/services/dashboard';

export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  return ok(await getResum());
}

export const dynamic = 'force-dynamic';
