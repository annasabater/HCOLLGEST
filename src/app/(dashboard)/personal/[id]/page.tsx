import { notFound, redirect } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { AbsenciaForm } from '@/components/personal/absencia-nomina-forms';
import { JornadesSection } from '@/components/personal/jornades-section';
import { TasquesNetejaSection } from '@/components/personal/tasques-neteja-section';
import { formatDate } from '@/lib/utils';
import { TIPUS_ABSENCIA_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

export default async function TreballadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/personal');

  const t = await prisma.treballador.findFirst({
    where: { id, deletedAt: null },
    include: {
      absencies: { orderBy: { dataInici: 'desc' } },
      jornades: { orderBy: { data: 'desc' }, take: 200 },
      tasquesNeteja: {
        orderBy: { data: 'desc' },
        take: 300,
        include: { habitacio: { select: { nom: true } } },
      },
    },
  });
  if (!t) notFound();

  const tarifes = {
    s: t.preuSortida ? Number(t.preuSortida) : 0,
    m: t.preuManteniment ? Number(t.preuManteniment) : 0,
    z: t.preuZones ? Number(t.preuZones) : 0,
  };

  const tasquesRows = t.tasquesNeteja.map((tk) => ({
    id: tk.id,
    data: tk.data.toISOString(),
    habitacio: tk.habitacio?.nom ?? null,
    tipus: tk.tipus,
    estat: tk.estat,
    importCalculat:
      tk.tipus === 'CANVI_COMPLET' ? tarifes.s : tarifes.m,
  }));

  const perTasques = !t.preuHora;

  return (
    <div>
      <BackLink fallback="/personal">Personal</BackLink>
      <PageHeader
        title={t.nom}
        subtitle={`${t.carrec}${t.preuHora ? ` · ${Number(t.preuHora)} €/h` : ''}${t.dni ? ` · ${t.dni}` : ''}`}
      />

      <div className="space-y-6">
        {/* Tasques de neteja (només per als que cobren per tasques) */}
        {perTasques && tasquesRows.length > 0 && (
          <Card>
            <CardBody>
              <TasquesNetejaSection tasques={tasquesRows} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Jornades i pagaments {t.preuHora ? '(per hores)' : '(per tasques)'}</CardTitle>
          </CardHeader>
          <CardBody>
            <JornadesSection
              treballadorId={t.id}
              preuHora={t.preuHora ? Number(t.preuHora) : null}
              tarifes={tarifes}
              jornades={t.jornades.map((j) => ({
                id: j.id,
                data: j.data.toISOString(),
                hores: Number(j.hores),
                preuHora: Number(j.preuHora),
                import: Number(j.import),
                notes: (j as { notes?: string | null }).notes ?? null,
                pagada: j.pagada,
                dataPagament: j.dataPagament ? j.dataPagament.toISOString() : null,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Absències</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {t.absencies.length === 0 ? (
              <EmptyState>Sense absències.</EmptyState>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Tipus</Th>
                    <Th>Inici</Th>
                    <Th>Fi</Th>
                  </tr>
                </Thead>
                <tbody>
                  {t.absencies.map((a) => (
                    <Tr key={a.id}>
                      <Td>{TIPUS_ABSENCIA_LABELS[a.tipus]}</Td>
                      <Td>{formatDate(a.dataInici)}</Td>
                      <Td>{formatDate(a.dataFi)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <div className="border-t border-slate-100 pt-4">
              <AbsenciaForm treballadorId={t.id} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
