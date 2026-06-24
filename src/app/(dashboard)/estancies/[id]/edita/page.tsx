import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { EditarEstadaForm } from '@/components/estancia/editar-estada-form';
import { toISODate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function EditarEstadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [estancia, habitacions] = await Promise.all([
    prisma.estancia.findFirst({ where: { id, deletedAt: null } }),
    prisma.habitacio.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true },
    }),
  ]);
  if (!estancia) notFound();

  return (
    <div>
      <Link
        href={`/estancies/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Estada
      </Link>
      <PageHeader
        title="Editar estada"
        subtitle={`Contracte ${estancia.numContracte}/${estancia.anyContracte} · les dades dels viatgers s'editen a la seva fitxa`}
      />
      <EditarEstadaForm
        estanciaId={estancia.id}
        habitacions={habitacions}
        inicial={{
          dataEntrada: toISODate(estancia.dataEntrada),
          dataSortida: toISODate(estancia.dataSortida),
          tipusPagament: estancia.tipusPagament,
          numHabitacions: estancia.numHabitacions,
          teInternet: estancia.teInternet,
          observacions: estancia.observacions,
          habitacioId: estancia.habitacioId,
        }}
      />
    </div>
  );
}
