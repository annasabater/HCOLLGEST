import { notFound, redirect } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { AbsenciaForm } from '@/components/personal/absencia-nomina-forms';
import { JornadesSection } from '@/components/personal/jornades-section';
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
    },
  });
  if (!t) notFound();

  // Tarifes de neteja (per als treballadors que cobren per tasques, sense preu/hora).
  const est = await prisma.establiment.findFirst({
    select: { preuNetejaSortida: true, preuNetejaManteniment: true, preuNetejaZones: true },
  });
  const tarifes = {
    s: est?.preuNetejaSortida ? Number(est.preuNetejaSortida) : 0,
    m: est?.preuNetejaManteniment ? Number(est.preuNetejaManteniment) : 0,
    z: est?.preuNetejaZones ? Number(est.preuNetejaZones) : 0,
  };

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
              tarifes={tarifes}
              jornades={t.jornades.map((j) => ({
                id: j.id,
                data: j.data.toISOString(),
                hores: Number(j.hores),
                preuHora: Number(j.preuHora),
                import: Number(j.import),
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
