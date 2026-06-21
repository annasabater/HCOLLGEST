import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { TIPUS_REGISTRE_LABELS, ESTAT_ENVIAMENT_LABELS } from '@/lib/validation/enums';
import type { EstatEnviament, EstatEstancia } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ESTAT_TONE: Record<EstatEstancia, 'neutral' | 'info' | 'success' | 'warning'> = {
  RESERVA: 'info',
  EN_CURS: 'warning',
  FINALITZADA: 'success',
  CANCELLADA: 'neutral',
};
const ESTAT_LABEL: Record<EstatEstancia, string> = {
  RESERVA: 'Reserva',
  EN_CURS: 'En curs',
  FINALITZADA: 'Finalitzada',
  CANCELLADA: 'Cancel·lada',
};
const ENV_TONE: Record<EstatEnviament, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDENT: 'warning',
  ENVIAT: 'info',
  ACCEPTAT: 'success',
  REBUTJAT: 'danger',
  ERROR: 'danger',
};

export default async function EstanciesPage() {
  const estancies = await prisma.estancia.findMany({
    where: { deletedAt: null },
    orderBy: { dataEntrada: 'desc' },
    take: 100,
    include: {
      viatgers: { where: { esTitular: true }, include: { huesped: true } },
      enviaments: { orderBy: { createdAt: 'desc' }, take: 1 },
      habitacio: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Estades"
        subtitle={`${estancies.length} estades`}
        actions={
          <Link href="/estancies/nou">
            <Button>
              <Plus className="h-4 w-4" /> Nova estada
            </Button>
          </Link>
        }
      />

      {estancies.length === 0 ? (
        <EmptyState>
          Encara no hi ha estades.{' '}
          <Link href="/estancies/nou" className="font-medium text-brand-700 underline">
            Crea la primera
          </Link>
          .
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Titular</Th>
              <Th>Tipus</Th>
              <Th>Entrada</Th>
              <Th>Sortida</Th>
              <Th>Hab.</Th>
              <Th>Estat</Th>
              <Th>Mossos</Th>
            </tr>
          </Thead>
          <tbody>
            {estancies.map((e) => {
              const titular = e.viatgers[0]?.huesped;
              const env = e.enviaments[0];
              return (
                <Tr key={e.id} className="cursor-pointer">
                  <Td>
                    <Link href={`/estancies/${e.id}`} className="font-medium text-slate-900">
                      {titular ? `${titular.nom} ${titular.cognom1}` : '—'}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {e.numContracte}/{e.anyContracte} · {e.numViatgers} viatger(s)
                    </div>
                  </Td>
                  <Td>{TIPUS_REGISTRE_LABELS[e.tipusRegistre]}</Td>
                  <Td>{formatDate(e.dataEntrada)}</Td>
                  <Td>{formatDate(e.dataSortida)}</Td>
                  <Td>{e.habitacio?.nom ?? '—'}</Td>
                  <Td>
                    <Badge tone={ESTAT_TONE[e.estat]}>{ESTAT_LABEL[e.estat]}</Badge>
                  </Td>
                  <Td>
                    {env ? (
                      <Badge tone={ENV_TONE[env.estat]}>{ESTAT_ENVIAMENT_LABELS[env.estat]}</Badge>
                    ) : (
                      <Badge tone="warning">Sense enviar</Badge>
                    )}
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
