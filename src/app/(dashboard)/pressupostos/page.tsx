import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Eur } from '@/components/finances/amounts-visibility';
import { NouPressupostButton } from '@/components/pressupost/nou-pressupost-button';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PressupostosPage() {
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/');

  const pressupostos = await prisma.pressupost.findMany({
    where: { deletedAt: null },
    orderBy: { numero: 'desc' },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Pressupostos"
        subtitle={`${pressupostos.length} pressupostos`}
        actions={<NouPressupostButton />}
      />

      <FinancesNav />

      {pressupostos.length === 0 ? (
        <EmptyState>Encara no hi ha pressupostos. Crea’n un amb «Nou pressupost».</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Data</Th>
              <Th>Client</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </Thead>
          <tbody>
            {pressupostos.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link href={`/pressupostos/${p.id}`} className="font-medium text-brand-700 hover:underline">
                    {p.numero}
                  </Link>
                </Td>
                <Td>{formatDate(p.data)}</Td>
                <Td>{p.clientNom || '—'}</Td>
                <Td className="text-right font-medium">
                  <Eur value={Number(p.total)} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
