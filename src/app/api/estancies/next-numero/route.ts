import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';

// GET /api/estancies/next-numero?any=YYYY
// Proposa el següent número de contracte per a l'any indicat: agafa el més alt
// registrat aquell any (ignorant ampliacions "26004.1") i li suma 1. Si no n'hi
// ha cap, comença per {yy}001 (p. ex. 2026 → 26001).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const anyNum = Number(new URL(req.url).searchParams.get('any')) || new Date().getFullYear();

    const [estancies, separats] = await Promise.all([
      prisma.estancia.findMany({
        where: { anyContracte: anyNum, deletedAt: null },
        select: { numContracte: true },
      }),
      // Contractes separats (viatgers amb habitació separada) del mateix any.
      prisma.estanciaViatger.findMany({
        where: {
          numContracteSeparat: { not: null },
          estancia: { anyContracte: anyNum, deletedAt: null },
        },
        select: { numContracteSeparat: true },
      }),
    ]);

    let max = 0;
    const nums = [
      ...estancies.map((e) => e.numContracte),
      ...separats.map((s) => s.numContracteSeparat ?? ''),
    ];
    for (const numStr of nums) {
      // Només números "purs" (sense punt d'ampliació) i numèrics.
      if (!numStr || numStr.includes('.')) continue;
      const n = parseInt(numStr, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }

    const yy = String(anyNum).slice(-2);
    const numero = max > 0 ? String(max + 1) : `${yy}001`;

    return ok({ numero, any: anyNum });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
