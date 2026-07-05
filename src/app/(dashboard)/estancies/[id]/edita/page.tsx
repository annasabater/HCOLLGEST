import { notFound } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { MasterForm, type MasterFormInitial } from '@/components/forms/master-form';
import { toISODate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const d = (x: Date | null) => (x ? toISODate(x) : '');

export default async function EditarEstadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [estancia, habitacions] = await Promise.all([
    prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      include: { viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } } },
    }),
    prisma.habitacio.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true },
    }),
  ]);
  if (!estancia) notFound();

  const initial: MasterFormInitial = {
    tipusRegistre: estancia.tipusRegistre,
    estancia: {
      numContracte: estancia.numContracte,
      anyContracte: String(estancia.anyContracte),
      dataFormalitzacio: d(estancia.dataFormalitzacio),
      dataEntrada: d(estancia.dataEntrada),
      dataSortida: d(estancia.dataSortida),
      tipusPagament: estancia.tipusPagament,
      habitacioId: estancia.habitacioId ?? '',
      teInternet: estancia.teInternet ?? false,
      observacions: estancia.observacions ?? '',
      idioma: estancia.idioma ?? 'ca',
    },
    viatgers: estancia.viatgers.map((ev) => ({
      huespedId: ev.huesped.id,
      nom: ev.huesped.nom,
      cognom1: ev.huesped.cognom1,
      cognom2: ev.huesped.cognom2 ?? '',
      sexe: ev.huesped.sexe ?? '',
      dataNaixement: d(ev.huesped.dataNaixement),
      nacionalitat: ev.huesped.nacionalitat ?? '',
      tipusDocument: ev.huesped.tipusDocument ?? '',
      numDocument: ev.huesped.numDocument ?? '',
      numSuport: ev.huesped.numSuport ?? '',
      dataExpedicio: d(ev.huesped.dataExpedicio),
      email: ev.huesped.email ?? '',
      telefon: ev.huesped.telefon ?? '',
      adreca: ev.huesped.adreca ?? '',
      pais: ev.huesped.pais ?? 'Espanya',
      provincia: ev.huesped.provincia ?? '',
      municipi: ev.huesped.municipi ?? '',
      localitat: ev.huesped.localitat ?? '',
      codiPostal: ev.huesped.codiPostal ?? '',
      esTitular: ev.esTitular,
      parentesc: ev.parentesc ?? '',
      esMenor: ev.esMenor,
      habitacioSeparadaId: ev.habitacioSeparadaId ?? '',
    })),
    esBorrany: estancia.esBorrany,
  };

  return (
    <div>
      <BackLink fallback={`/estancies/${id}`}>Estada</BackLink>
      <PageHeader
        title="Editar estada"
        subtitle={`Contracte ${estancia.numContracte}/${estancia.anyContracte}${
          estancia.esBorrany ? ' · esborrany' : ''
        }`}
      />
      <MasterForm
        mode="edit"
        estanciaId={estancia.id}
        habitacions={habitacions}
        initial={initial}
        creadaAvui={toISODate(estancia.createdAt) === toISODate(new Date())}
      />
    </div>
  );
}
