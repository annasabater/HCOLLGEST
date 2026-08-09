import { notFound, redirect } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JornadesSection } from '@/components/personal/jornades-section';

export const dynamic = 'force-dynamic';

interface BugItem { article: string; qty: number }

export default async function TreballadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/personal');

  const t = await prisma.treballador.findFirst({
    where: { id, deletedAt: null },
    include: {
      jornades: { orderBy: { data: 'desc' }, take: 200 },
    },
  });
  if (!t) notFound();

  // Bugaderia feta per aquest treballador (tasques de neteja amb articles marcats).
  const [cataleg, tasquesBug] = await Promise.all([
    prisma.articleBugaderia.findMany({ where: { deletedAt: null }, select: { nom: true, preu: true } }),
    prisma.tascaNeteja.findMany({
      where: { assignadaA: t.id },
      select: { id: true, data: true, tipus: true, bugaderia: true, habitacio: { select: { nom: true } } },
      orderBy: { data: 'desc' },
      take: 400,
    }),
  ]);
  const preu = new Map(cataleg.map((a) => [a.nom.normalize('NFC'), Number(a.preu)]));
  const costDe = (items: BugItem[]) =>
    Math.round(items.reduce((s, i) => s + (preu.get(i.article.normalize('NFC')) ?? 0) * i.qty, 0) * 100) / 100;

  const bugRows = tasquesBug
    .filter((x) => Array.isArray(x.bugaderia) && (x.bugaderia as unknown[]).length > 0)
    .map((x) => {
      const items = x.bugaderia as unknown as BugItem[];
      const iso = x.data.toISOString();
      return {
        id: x.id,
        data: iso,
        mes: iso.slice(0, 7),
        habitacio: x.habitacio?.nom ?? null,
        tipus: x.tipus as 'CANVI_COMPLET' | 'REPAS',
        articles: items.map((i) => `${i.qty}× ${i.article}`).join(', '),
        cost: costDe(items),
      };
    });

  // Agrupa per mes (més recent a dalt) amb subtotal.
  const mesos = [...new Set(bugRows.map((r) => r.mes))].sort((a, b) => b.localeCompare(a));
  const grups = mesos.map((mes) => {
    const files = bugRows.filter((r) => r.mes === mes);
    const total = Math.round(files.reduce((s, r) => s + r.cost, 0) * 100) / 100;
    return { mes, files, total };
  });
  const fmtDiaMes = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  const fmtMes = (mes: string) => new Date(`${mes}-01T00:00:00`).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
  const fmtEur = (n: number) => `${n.toFixed(2)} €`;

  return (
    <div>
      <BackLink fallback="/personal">Personal</BackLink>
      <PageHeader
        title={t.nom}
        subtitle={`${t.carrec}${t.preuHora ? ` · ${Number(t.preuHora)} €/h` : ''}${t.dni ? ` · ${t.dni}` : ''}`}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Jornades i pagaments {t.preuHora ? '(per hores)' : '(per tasques)'}</CardTitle>
          </CardHeader>
          <CardBody>
            <JornadesSection
              treballadorId={t.id}
              preuHora={t.preuHora ? Number(t.preuHora) : null}
              jornades={t.jornades.map((j) => ({
                id: j.id,
                data: j.data.toISOString(),
                hores: Number(j.hores),
                preuHora: Number(j.preuHora),
                import: Number(j.import),
                notes: j.notes ?? null,
                pagada: j.pagada,
                dataPagament: j.dataPagament ? j.dataPagament.toISOString() : null,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bugaderia</CardTitle>
          </CardHeader>
          <CardBody>
            {grups.length === 0 ? (
              <p className="text-sm text-slate-400">Encara no hi ha cap dia amb bugaderia marcada per a aquesta persona.</p>
            ) : (
              <div className="space-y-5">
                {grups.map(({ mes, files, total }) => (
                  <div key={mes}>
                    <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-sm font-semibold capitalize text-slate-700">{fmtMes(mes)}</span>
                      <span className="text-sm font-bold text-slate-900">{fmtEur(total)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-slate-400">
                            <th className="py-1 text-left font-medium">Dia</th>
                            <th className="py-1 text-center font-medium">Hab.</th>
                            <th className="py-1 text-center font-medium">Tipus</th>
                            <th className="py-1 text-left font-medium">Articles</th>
                            <th className="py-1 text-right font-medium">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.map((r) => (
                            <tr key={r.id} className="border-t border-slate-50 align-top">
                              <td className="py-1.5 whitespace-nowrap text-slate-500">{fmtDiaMes(r.data)}</td>
                              <td className="py-1.5 text-center text-slate-500">{r.habitacio ?? '—'}</td>
                              <td className="py-1.5 text-center">
                                <Badge tone={r.tipus === 'CANVI_COMPLET' ? 'warning' : 'neutral'} className="text-xs">
                                  {r.tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Repàs'}
                                </Badge>
                              </td>
                              <td className="py-1.5 text-slate-600">{r.articles}</td>
                              <td className="py-1.5 text-right font-medium text-slate-800">{fmtEur(r.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  Bugaderia marcada a <strong>Neteja</strong> per als dies que aquesta persona ha netejat. Serveix per comprovar la seva factura.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
