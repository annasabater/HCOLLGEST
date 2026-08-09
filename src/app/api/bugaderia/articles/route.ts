import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, created, handleApiError } from '@/lib/http';
import { z } from 'zod';

// GET /api/bugaderia/articles — catàleg (per a la config). Inclou preus i estat.
export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const articles = await prisma.articleBugaderia.findMany({
      where: { deletedAt: null },
      orderBy: { ordre: 'asc' },
      select: { id: true, nom: true, preu: true, ordre: true, actiu: true },
    });
    return ok({ articles: articles.map((a) => ({ ...a, preu: Number(a.preu) })) });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  preu: z.coerce.number().nonnegative(),
  ordre: z.coerce.number().int().optional(),
});

// POST /api/bugaderia/articles — nou article del catàleg.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const d = CreateSchema.parse(await req.json().catch(() => null));
    const max = await prisma.articleBugaderia.aggregate({ _max: { ordre: true } });
    const article = await prisma.articleBugaderia.create({
      data: { nom: d.nom, preu: d.preu, ordre: d.ordre ?? (max._max.ordre ?? 0) + 1 },
    });
    return created({ article });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
