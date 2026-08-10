import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { PressupostForm, type PressupostData } from '@/components/pressupost/pressupost-form';
import { toISODate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function PressupostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/');

  const p = await prisma.pressupost.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: { orderBy: { createdAt: 'asc' } },
      estancia: {
        select: {
          numContracte: true,
          anyContracte: true,
          viatgers: { where: { esTitular: true }, take: 1, include: { huesped: true } },
        },
      },
    },
  });
  if (!p) notFound();

  // Si està enllaçat a una estada i el client és buit, mostra les dades del titular.
  const titular = p.estancia?.viatgers[0]?.huesped ?? null;

  const inicial: PressupostData = {
    id: p.id,
    numero: p.numero,
    data: toISODate(p.data),
    validesa: p.validesa ? toISODate(p.validesa) : null,
    idioma: (['ca', 'es', 'fr', 'en'].includes(p.idioma) ? p.idioma : 'ca') as 'ca' | 'es' | 'fr' | 'en',
    estanciaId: p.estanciaId,
    estanciaLabel: p.estancia ? `Contracte ${p.estancia.numContracte}/${p.estancia.anyContracte}` : null,
    clientNom: p.clientNom || (titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : ''),
    clientNif: p.clientNif || (titular?.numDocument ? `${titular.tipusDocument ?? 'DNI'} ${titular.numDocument}` : ''),
    clientAdreca: p.clientAdreca || titular?.adreca || '',
    clientLocalitat: p.clientLocalitat || (titular ? [titular.codiPostal, titular.municipi || titular.localitat].filter(Boolean).join(' ') : ''),
    compte: p.compte ?? '',
    notes: p.notes ?? '',
    ivaPercent: Number(p.ivaPercent),
    linies: p.linies.length
      ? p.linies.map((l) => ({ descripcio: l.descripcio, import: String(Number(l.import)) }))
      : [{ descripcio: '', import: '' }],
  };

  return (
    <div>
      <BackLink fallback="/pressupostos">Pressupostos</BackLink>
      <PageHeader title={`Pressupost ${p.numero}`} subtitle="Edita’l i imprimeix-lo" />
      <PressupostForm inicial={inicial} />
    </div>
  );
}
