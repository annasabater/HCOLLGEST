import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { PerRepartirLlista } from '@/components/balanc/per-repartir';
import { pagamentsPerRepartir } from '@/lib/services/repartiment-cobraments';

export const dynamic = 'force-dynamic';

export default async function RepartirPage() {
  const user = await getSessionUser();
  if (!user || !hasRole(user.role, ROLES_WRITE)) redirect('/balanc');
  const llista = await pagamentsPerRepartir({ ambProposta: true });

  return (
    <>
      <BackLink fallback="/balanc">Balanç</BackLink>
      <PageHeader
        title="Pagaments per repartir"
        subtitle="Pagaments d’estades de més d’un mes que compten sencers el dia que es van cobrar. En repartir-los, el Balanç posa cada part al seu mes. Les factures no canvien."
      />
      <PerRepartirLlista inicial={llista} />
    </>
  );
}
