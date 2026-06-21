import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { TreballadorForm } from '@/components/personal/treballador-form';
import { formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PersonalPage() {
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Personal" />
        <p className="text-sm text-red-600">Només els administradors poden accedir a personal.</p>
      </div>
    );
  }

  const treballadors = await prisma.treballador.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    include: { _count: { select: { absencies: true, nomines: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Personal"
        subtitle={`${treballadors.length} treballadors`}
        actions={<TreballadorForm />}
      />

      {treballadors.length === 0 ? (
        <EmptyState>Encara no hi ha treballadors.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nom</Th>
              <Th>Càrrec</Th>
              <Th>Salari</Th>
              <Th>Cost empresa</Th>
              <Th>Absències</Th>
              <Th>Nòmines</Th>
            </tr>
          </Thead>
          <tbody>
            {treballadors.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <Link href={`/personal/${t.id}`} className="font-medium text-slate-900">
                    {t.nom}
                  </Link>
                  <div className="text-xs text-slate-400">{t.dni}</div>
                </Td>
                <Td>{t.carrec}</Td>
                <Td>{t.salari ? formatEur(Number(t.salari)) : '—'}</Td>
                <Td>{t.costEmpresa ? formatEur(Number(t.costEmpresa)) : '—'}</Td>
                <Td>{t._count.absencies}</Td>
                <Td>{t._count.nomines}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
