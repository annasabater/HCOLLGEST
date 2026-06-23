import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FacturesPage() {
  const factures = await prisma.factura.findMany({
    where: { deletedAt: null },
    orderBy: { data: 'desc' },
    take: 100,
    include: {
      estancia: { include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } } },
    },
  });

  const pendents = factures.filter((f) => f.estat === 'PENDENT');
  const totalPendent = pendents.reduce((a, f) => a + Number(f.total), 0);

  return (
    <div>
      <PageHeader
        title="Facturació"
        subtitle={
          <>
            {factures.length} factures · <Eur value={totalPendent} /> pendent de cobrament
          </>
        }
        actions={<HideAmountsButton />}
      />

      <FinancesNav />

      {factures.length === 0 ? (
        <EmptyState>Encara no hi ha factures. Crea’n una des d’una estada.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Titular</Th>
              <Th>Data</Th>
              <Th>Base</Th>
              <Th>Total</Th>
              <Th>Estat</Th>
            </tr>
          </Thead>
          <tbody>
            {factures.map((f) => {
              const t = f.estancia.viatgers[0]?.huesped;
              return (
                <Tr key={f.id}>
                  <Td>
                    <Link href={`/factures/${f.id}`} className="font-medium text-brand-700">
                      {f.numero}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {f.tipusDocument === 'RECIBO'
                        ? 'Recibo'
                        : f.tipusDocument === 'FACTURA'
                          ? 'Factura F1'
                          : 'Factura F2'}
                    </div>
                  </Td>
                  <Td>{t ? `${t.nom} ${t.cognom1}` : '—'}</Td>
                  <Td>{formatDate(f.data)}</Td>
                  <Td><Eur value={Number(f.base)} /></Td>
                  <Td className="font-medium"><Eur value={Number(f.total)} /></Td>
                  <Td>
                    <Badge tone={f.estat === 'COBRADA' ? 'success' : 'warning'}>
                      {f.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
                    </Badge>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
