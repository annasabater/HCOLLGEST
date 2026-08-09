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
    include: { linies: { orderBy: { createdAt: 'asc' } } },
  });
  if (!p) notFound();

  const inicial: PressupostData = {
    id: p.id,
    numero: p.numero,
    data: toISODate(p.data),
    validesa: p.validesa ? toISODate(p.validesa) : null,
    clientNom: p.clientNom ?? '',
    clientNif: p.clientNif ?? '',
    clientAdreca: p.clientAdreca ?? '',
    clientLocalitat: p.clientLocalitat ?? '',
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
