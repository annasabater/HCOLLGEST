import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok } from '@/lib/http';

interface Hit {
  id: string;
  label: string;
  sub: string;
  href: string;
}

// GET /api/cerca?q= — buscador global (huéspedes, estancias, facturas, gastos, activos, personal)
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return ok({ q, grups: [] });

  const ci = { contains: q, mode: 'insensitive' as const };

  const [huespedes, estancies, factures, gastos, actius, treballadors] = await Promise.all([
    prisma.huesped.findMany({
      where: {
        deletedAt: null,
        OR: [{ nom: ci }, { cognom1: ci }, { cognom2: ci }, { numDocument: ci }, { email: ci }],
      },
      take: 8,
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, numContracte: ci },
      take: 8,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } },
    }),
    prisma.factura.findMany({ where: { deletedAt: null, numero: ci }, take: 8 }),
    prisma.gasto.findMany({ where: { deletedAt: null, descripcio: ci }, take: 8, include: { categoria: true } }),
    prisma.actiu.findMany({ where: { deletedAt: null, OR: [{ nom: ci }, { numSerie: ci }] }, take: 8 }),
    auth.role === 'ADMIN'
      ? prisma.treballador.findMany({
          where: { deletedAt: null, OR: [{ nom: ci }, { dni: ci }] },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const grups: { titol: string; hits: Hit[] }[] = [];
  const push = (titol: string, hits: Hit[]) => {
    if (hits.length) grups.push({ titol, hits });
  };

  push(
    'Hostes',
    huespedes.map((h) => ({
      id: h.id,
      label: `${h.nom} ${h.cognom1} ${h.cognom2 ?? ''}`.trim(),
      sub: h.numDocument ?? h.email ?? '',
      href: `/huespedes/${h.id}`,
    })),
  );
  push(
    'Estades',
    estancies.map((e) => ({
      id: e.id,
      label: `Contracte ${e.numContracte}/${e.anyContracte}`,
      sub: e.viatgers[0]?.huesped ? `${e.viatgers[0]!.huesped.nom} ${e.viatgers[0]!.huesped.cognom1}` : '',
      href: `/estancies/${e.id}`,
    })),
  );
  push(
    'Factures',
    factures.map((f) => ({ id: f.id, label: f.numero, sub: `${Number(f.total)} €`, href: `/factures/${f.id}` })),
  );
  push(
    'Despeses',
    gastos.map((g) => ({
      id: g.id,
      label: g.descripcio,
      sub: `${g.categoria.nom} · ${Number(g.import)} €`,
      href: `/gastos`,
    })),
  );
  push(
    'Actius',
    actius.map((a) => ({ id: a.id, label: a.nom, sub: a.categoria, href: `/actius/${a.id}` })),
  );
  push(
    'Personal',
    treballadors.map((t) => ({ id: t.id, label: t.nom, sub: t.carrec, href: `/personal/${t.id}` })),
  );

  return ok({ q, grups });
}

export const dynamic = 'force-dynamic';
