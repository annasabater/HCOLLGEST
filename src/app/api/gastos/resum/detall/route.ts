import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';

// GET /api/gastos/resum/detall?year=2026&mes=7   (mes 1-12)
//                              ?year=2026&trimestre=3  (trimestre 1-4)
// Desglossament de les despeses d'un mes o trimestre: per categoria (separant
// despesa real de fiança) i el total de nòmines del personal. Serveix per veure
// "de què" es compon cada import del resum de /gastos.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const year = Number(url.searchParams.get('year')) || new Date().getUTCFullYear();
    const mes = Number(url.searchParams.get('mes')); // 1-12
    const trimestre = Number(url.searchParams.get('trimestre')); // 1-4

    // Rang de mesos (índex 0-11) segons mes o trimestre.
    let mesInici: number;
    let mesFi: number; // exclusiu
    if (mes >= 1 && mes <= 12) {
      mesInici = mes - 1;
      mesFi = mes;
    } else if (trimestre >= 1 && trimestre <= 4) {
      mesInici = (trimestre - 1) * 3;
      mesFi = trimestre * 3;
    } else {
      mesInici = 0;
      mesFi = 12;
    }
    const start = new Date(Date.UTC(year, mesInici, 1));
    const end = new Date(Date.UTC(year, mesFi, 1));

    const [gastos, nomines] = await Promise.all([
      prisma.gasto.findMany({
        where: { deletedAt: null, data: { gte: start, lt: end } },
        select: { import: true, esFianca: true, categoria: { select: { nom: true } } },
      }),
      prisma.nomina.findMany({
        where: { periode: { startsWith: `${year}-` } },
        select: { periode: true, total: true },
      }),
    ]);

    // Agrupa per categoria, separant despesa real (sense) de fiança.
    const perCat = new Map<string, { sense: number; fianca: number }>();
    for (const g of gastos) {
      const nom = g.categoria?.nom ?? 'Sense categoria';
      const acc = perCat.get(nom) ?? { sense: 0, fianca: 0 };
      if (g.esFianca) acc.fianca += Number(g.import);
      else acc.sense += Number(g.import);
      perCat.set(nom, acc);
    }
    const categories = [...perCat.entries()]
      .map(([nom, v]) => ({ nom, sense: v.sense, fianca: v.fianca }))
      .sort((a, b) => b.sense + b.fianca - (a.sense + a.fianca));

    // Nòmines del personal dins el rang de mesos.
    let personal = 0;
    for (const n of nomines) {
      const m = Number(n.periode.slice(5, 7)) - 1; // 0-11
      if (m >= mesInici && m < mesFi) personal += Number(n.total);
    }

    return ok({ categories, personal });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
