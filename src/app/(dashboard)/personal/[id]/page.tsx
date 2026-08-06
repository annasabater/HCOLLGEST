import { notFound, redirect } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { JornadesSection } from '@/components/personal/jornades-section';

export const dynamic = 'force-dynamic';

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
      </div>
    </div>
  );
}
