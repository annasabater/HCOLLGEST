import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';

// GET /api/gastos/resum?year=2026
// Totals de despeses reals (esFianca=false, inclou variables + fixes) de l'any,
// desglossats per mes, per trimestre i anual. Serveix per al resum de dalt de tot
// a /gastos.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const year = Number(url.searchParams.get('year')) || new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const gastos = await prisma.gasto.findMany({
      where: { deletedAt: null, esFianca: false, data: { gte: start, lt: end } },
      select: { data: true, import: true },
    });

    const mesos = Array<number>(12).fill(0);
    for (const g of gastos) {
      const m = g.data.getUTCMonth();
      mesos[m] = (mesos[m] ?? 0) + Number(g.import);
    }
    const trimestres = [0, 0, 0, 0];
    mesos.forEach((v, i) => {
      const q = Math.floor(i / 3);
      trimestres[q] = (trimestres[q] ?? 0) + v;
    });
    const anual = mesos.reduce((a, b) => a + b, 0);

    return ok({ year, mesos, trimestres, anual });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
