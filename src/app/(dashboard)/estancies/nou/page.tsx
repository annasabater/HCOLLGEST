import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { MasterForm } from '@/components/forms/master-form';
import type { HosteLite } from '@/components/forms/hoste-search';

export const dynamic = 'force-dynamic';

// /estancies/nou?hoste=<id> → preomple el formulari amb una fitxa existent.
export default async function NovaEstanciaPage({
  searchParams,
}: {
  searchParams: Promise<{ hoste?: string }>;
}) {
  const { hoste } = await searchParams;

  const [habitacions, huesped] = await Promise.all([
    prisma.habitacio.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true },
    }),
    hoste ? prisma.huesped.findFirst({ where: { id: hoste, deletedAt: null } }) : Promise.resolve(null),
  ]);

  const initialHoste: HosteLite | null = huesped
    ? {
        id: huesped.id,
        nom: huesped.nom,
        cognom1: huesped.cognom1,
        cognom2: huesped.cognom2,
        sexe: huesped.sexe,
        dataNaixement: huesped.dataNaixement ? huesped.dataNaixement.toISOString() : null,
        nacionalitat: huesped.nacionalitat,
        tipusDocument: huesped.tipusDocument,
        numDocument: huesped.numDocument,
        numSuport: huesped.numSuport,
        dataExpedicio: huesped.dataExpedicio ? huesped.dataExpedicio.toISOString() : null,
        email: huesped.email,
        telefon: huesped.telefon,
        adreca: huesped.adreca,
        pais: huesped.pais,
        provincia: huesped.provincia,
        municipi: huesped.municipi,
        localitat: huesped.localitat,
        codiPostal: huesped.codiPostal,
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Nova estada"
        subtitle={
          initialHoste
            ? `Reaprofitant la fitxa de ${initialHoste.nom} ${initialHoste.cognom1} · posa dates i habitació`
            : 'Formulari mestre · una sola entrada de dades per a Mossos, llibre i CRM'
        }
      />
      <MasterForm habitacions={habitacions} initialHoste={initialHoste} />
    </div>
  );
}
