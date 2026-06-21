import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { MasterForm } from '@/components/forms/master-form';

export const dynamic = 'force-dynamic';

export default async function NovaEstanciaPage() {
  const habitacions = await prisma.habitacio.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true },
  });

  return (
    <div>
      <PageHeader
        title="Nova estada"
        subtitle="Formulari mestre · una sola entrada de dades per a Mossos, llibre i CRM"
      />
      <MasterForm habitacions={habitacions} />
    </div>
  );
}
