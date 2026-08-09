import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';

// GET /api/bugaderia/habitacions — habitacions amb els seus valors per defecte de bugaderia.
export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const habitacions = await prisma.habitacio.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true, bugaderiaDefault: true },
    });
    return ok({ habitacions });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
