import { notFound, redirect } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { CompteTreballador } from '@/components/personal/compte-treballador';
import { movimentsCompte } from '@/lib/services/compte-treballador';

export const dynamic = 'force-dynamic';

export default async function TreballadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/personal');

  const t = await prisma.treballador.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, nom: true, carrec: true, dni: true, preuHora: true },
  });
  if (!t) notFound();

  // Tot l'històric: el filtre de període es fa al client, així canviar-lo és
  // immediat i no cal tornar al servidor per a cada rang.
  const moviments = await movimentsCompte(t.id);

  return (
    <div>
      <BackLink fallback="/personal">Personal</BackLink>
      <PageHeader
        title={t.nom}
        subtitle={`${t.carrec}${t.preuHora ? ` · ${Number(t.preuHora)} €/h` : ' · cobra per tasques'}${t.dni ? ` · ${t.dni}` : ''}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Compte {t.preuHora ? '(jornades per hores i bugaderia)' : '(neteja i bugaderia)'}</CardTitle>
        </CardHeader>
        <CardBody>
          <CompteTreballador
            treballadorId={t.id}
            preuHora={t.preuHora ? Number(t.preuHora) : null}
            moviments={moviments}
          />
        </CardBody>
      </Card>
    </div>
  );
}
