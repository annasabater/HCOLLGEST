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
        select: {
          import: true,
          esFianca: true,
          descripcio: true,
          categoria: { select: { nom: true } },
          proveidor: { select: { nom: true } },
        },
      }),
      prisma.nomina.findMany({
        where: { periode: { startsWith: `${year}-` } },
        select: { periode: true, total: true },
      }),
    ]);

    // Despeses reals: per categoria. Fiances: per PROVEÏDOR (per identificar-les).
    const perCat = new Map<string, number>();
    const perProvFianca = new Map<string, number>();
    for (const g of gastos) {
      if (g.esFianca) {
        const prov = g.proveidor?.nom ?? g.descripcio ?? 'Sense proveïdor';
        perProvFianca.set(prov, (perProvFianca.get(prov) ?? 0) + Number(g.import));
      } else {
        const nom = g.categoria?.nom ?? 'Sense categoria';
        perCat.set(nom, (perCat.get(nom) ?? 0) + Number(g.import));
      }
    }
    const categories = [...perCat.entries()]
      .map(([nom, sense]) => ({ nom, sense }))
      .sort((a, b) => b.sense - a.sense);
    const fiances = [...perProvFianca.entries()]
      .map(([proveidor, total]) => ({ proveidor, import: total }))
      .sort((a, b) => b.import - a.import);

    // Nòmines del personal dins el rang de mesos.
    let personal = 0;
    for (const n of nomines) {
      const m = Number(n.periode.slice(5, 7)) - 1; // 0-11
      if (m >= mesInici && m < mesFi) personal += Number(n.total);
    }

    return ok({ categories, fiances, personal });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
