import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FacturesPage() {
  const user = await getSessionUser();
  const restringit = teVistaRestringida(user);

  const totes = await prisma.factura.findMany({
    where: { deletedAt: null },
    orderBy: { data: 'desc' },
    take: 100,
    include: {
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
          diposits: { where: { estat: 'EN_CUSTODIA' } },
        },
      },
    },
  });
  // Vista restringida de propietat: amaga les factures d'estades amb fiança en
  // custòdia (les que tenen un dipòsit EN_CUSTODIA).
  const factures = restringit ? totes.filter((f) => f.estancia.diposits.length === 0) : totes;

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
                      {f.numero.replace(/^\d{4}-/, '')}
                    </Link>
                    {f.fiancaInclosa === true && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                        Fiança
                      </span>
                    )}
                    {f.fiancaInclosa === false && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                        Sense fiança
                      </span>
                    )}
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
