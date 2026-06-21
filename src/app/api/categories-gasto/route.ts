import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok } from '@/lib/http';

export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const categories = await prisma.categoriaGasto.findMany({ orderBy: { nom: 'asc' } });
  return ok({ categories });
}

export const dynamic = 'force-dynamic';
