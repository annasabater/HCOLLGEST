import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { HistorialForm } from '@/components/actiu/historial-form';
import { formatDate, formatEur } from '@/lib/utils';
import { computeActiuInfo } from '@/lib/actiu-alerts';
import { ESTAT_ACTIU_LABELS, TIPUS_HISTORIAL_ACTIU_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

function Dl({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default async function ActiuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actiu = await prisma.actiu.findFirst({
    where: { id, deletedAt: null },
    include: { proveidor: true, habitacio: true, historial: { orderBy: { data: 'desc' } } },
  });
  if (!actiu) notFound();

  const info = computeActiuInfo(
    { dataCompra: actiu.dataCompra, garantiaFins: actiu.garantiaFins, estat: actiu.estat },
    new Date(),
  );

  return (
    <div>
      <BackLink fallback="/actius">Actius</BackLink>
      <PageHeader
        title={actiu.nom}
        subtitle={`${actiu.categoria} · ${info.anysAntiguitat} anys d’antiguitat`}
        actions={<Badge tone={actiu.estat === 'OBSOLET' ? 'danger' : 'neutral'}>{ESTAT_ACTIU_LABELS[actiu.estat]}</Badge>}
      />

      {info.alerta && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5" /> {info.motiu}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Dades</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <Dl label="Data de compra" value={formatDate(actiu.dataCompra)} />
                <Dl label="Cost" value={formatEur(Number(actiu.cost))} />
                <Dl label="Garantia fins" value={formatDate(actiu.garantiaFins)} />
                <Dl label="Habitació" value={actiu.habitacio?.nom} />
                <Dl label="Proveïdor" value={actiu.proveidor?.nom} />
                <Dl label="Ubicació" value={actiu.ubicacio} />
                <Dl label="Núm. de sèrie" value={actiu.numSerie} />
              </dl>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {actiu.historial.length === 0 ? (
                <EmptyState>Sense incidències registrades.</EmptyState>
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Data</Th>
                      <Th>Tipus</Th>
                      <Th>Descripció</Th>
                      <Th className="text-right">Cost</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {actiu.historial.map((h) => (
                      <Tr key={h.id}>
                        <Td>{formatDate(h.data)}</Td>
                        <Td>{TIPUS_HISTORIAL_ACTIU_LABELS[h.tipus]}</Td>
                        <Td>{h.descripcio}</Td>
                        <Td className="text-right">{h.cost ? formatEur(Number(h.cost)) : '—'}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <div className="border-t border-slate-100 pt-4">
                <HistorialForm actiuId={actiu.id} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
