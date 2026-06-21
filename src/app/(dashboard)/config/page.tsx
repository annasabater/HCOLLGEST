import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { ConfigForm } from '@/components/config/config-form';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Configuració" />
        <p className="text-sm text-red-600">Només els administradors poden accedir a la configuració.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Configuració" subtitle="Establiment, Mossos (§9), facturació i RGPD" />
      <ConfigForm />
    </div>
  );
}
