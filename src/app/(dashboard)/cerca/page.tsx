import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface Hit {
  id: string;
  label: string;
  sub: string;
  href: string;
}

async function search(q: string, isAdmin: boolean): Promise<{ titol: string; hits: Hit[] }[]> {
  const ci = { contains: q, mode: 'insensitive' as const };
  const [huespedes, estancies, factures, gastos, actius, treballadors] = await Promise.all([
    prisma.huesped.findMany({
      where: {
        deletedAt: null,
        OR: [{ nom: ci }, { cognom1: ci }, { cognom2: ci }, { numDocument: ci }, { email: ci }],
      },
      take: 10,
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, numContracte: ci },
      take: 10,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } },
    }),
    isAdmin
      ? prisma.factura.findMany({ where: { deletedAt: null, numero: ci }, take: 10 })
      : Promise.resolve([]),
    isAdmin
      ? prisma.gasto.findMany({ where: { deletedAt: null, descripcio: ci }, take: 10, include: { categoria: true } })
      : Promise.resolve([]),
    prisma.actiu.findMany({ where: { deletedAt: null, OR: [{ nom: ci }, { numSerie: ci }] }, take: 10 }),
    isAdmin
      ? prisma.treballador.findMany({ where: { deletedAt: null, OR: [{ nom: ci }, { dni: ci }] }, take: 10 })
      : Promise.resolve([]),
  ]);

  const grups: { titol: string; hits: Hit[] }[] = [];
  const add = (titol: string, hits: Hit[]) => hits.length && grups.push({ titol, hits });

  add(
    'Hostes',
    huespedes.map((h) => ({
      id: h.id,
      label: `${h.nom} ${h.cognom1} ${h.cognom2 ?? ''}`.trim(),
      sub: h.numDocument ?? h.email ?? '',
      href: `/huespedes/${h.id}`,
    })),
  );
  add(
    'Estades',
    estancies.map((e) => ({
      id: e.id,
      label: `Contracte ${e.numContracte}/${e.anyContracte}`,
      sub: e.viatgers[0]?.huesped ? `${e.viatgers[0]!.huesped.nom} ${e.viatgers[0]!.huesped.cognom1}` : '',
      href: `/estancies/${e.id}`,
    })),
  );
  add('Factures', factures.map((f) => ({ id: f.id, label: f.numero, sub: `${Number(f.total)} €`, href: `/factures/${f.id}` })));
  add(
    'Despeses',
    gastos.map((g) => ({ id: g.id, label: g.descripcio, sub: g.categoria.nom, href: `/gastos` })),
  );
  add('Actius', actius.map((a) => ({ id: a.id, label: a.nom, sub: a.categoria, href: `/actius/${a.id}` })));
  add('Personal', treballadors.map((t) => ({ id: t.id, label: t.nom, sub: t.carrec, href: `/personal/${t.id}` })));
  return grups;
}

export default async function CercaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getSessionUser();
  const query = (q ?? '').trim();
  const grups = query.length >= 2 ? await search(query, user?.role === 'ADMIN') : [];
  const total = grups.reduce((a, g) => a + g.hits.length, 0);

  return (
    <div>
      <PageHeader title="Cerca" subtitle={query ? `${total} resultats per «${query}»` : undefined} />
      {query.length < 2 ? (
        <EmptyState>Escriu almenys 2 caràcters per cercar.</EmptyState>
      ) : grups.length === 0 ? (
        <EmptyState>Cap resultat per «{query}».</EmptyState>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {grups.map((g) => (
            <Card key={g.titol}>
              <CardHeader>
                <CardTitle>{g.titol}</CardTitle>
              </CardHeader>
              <CardBody className="divide-y divide-slate-100">
                {g.hits.map((h) => (
                  <Link key={h.id} href={h.href} className="flex items-center justify-between py-2 hover:bg-slate-50">
                    <span className="font-medium text-slate-800">{h.label}</span>
                    <span className="text-xs text-slate-400">{h.sub}</span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
