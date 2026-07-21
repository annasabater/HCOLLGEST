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

    const [gastos, nomines] = await Promise.all([
      prisma.gasto.findMany({
        where: { deletedAt: null, data: { gte: start, lt: end } },
        select: { data: true, import: true, esFianca: true },
      }),
      // Nòmines del personal (periode 'YYYY-MM'): despesa real (mai fiança).
      prisma.nomina.findMany({
        where: { periode: { startsWith: `${year}-` } },
        select: { periode: true, total: true },
      }),
    ]);

    // Despeses reals (sense fiança) i fiances/dipòsits, per separat.
    const mSense = Array<number>(12).fill(0);
    const mFianca = Array<number>(12).fill(0);
    for (const g of gastos) {
      const m = g.data.getUTCMonth();
      if (g.esFianca) mFianca[m] = (mFianca[m] ?? 0) + Number(g.import);
      else mSense[m] = (mSense[m] ?? 0) + Number(g.import);
    }
    for (const n of nomines) {
      const m = Number(n.periode.slice(5, 7)) - 1; // 'YYYY-MM' → 0-11
      if (m >= 0 && m <= 11) mSense[m] = (mSense[m] ?? 0) + Number(n.total);
    }
    const mTotal = mSense.map((v, i) => v + (mFianca[i] ?? 0));

    const build = (mesos: number[]) => {
      const trimestres = [0, 0, 0, 0];
      mesos.forEach((v, i) => {
        const q = Math.floor(i / 3);
        trimestres[q] = (trimestres[q] ?? 0) + v;
      });
      return { mesos, trimestres, anual: mesos.reduce((a, b) => a + b, 0) };
    };

    return ok({
      year,
      senseFianca: build(mSense),
      ambFianca: build(mFianca),
      total: build(mTotal),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
