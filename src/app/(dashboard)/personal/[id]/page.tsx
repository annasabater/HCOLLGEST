import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { AbsenciaForm, NominaForm } from '@/components/personal/absencia-nomina-forms';
import { formatDate, formatEur } from '@/lib/utils';
import { TIPUS_ABSENCIA_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

export default async function TreballadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/personal');

  const t = await prisma.treballador.findFirst({
    where: { id, deletedAt: null },
    include: {
      absencies: { orderBy: { dataInici: 'desc' } },
      nomines: { orderBy: { periode: 'desc' } },
    },
  });
  if (!t) notFound();

  return (
    <div>
      <Link href="/personal" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Personal
      </Link>
      <PageHeader title={t.nom} subtitle={`${t.carrec} · ${t.dni}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Absències</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {t.absencies.length === 0 ? (
              <EmptyState>Sense absències.</EmptyState>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Tipus</Th>
                    <Th>Inici</Th>
                    <Th>Fi</Th>
                  </tr>
                </Thead>
                <tbody>
                  {t.absencies.map((a) => (
                    <Tr key={a.id}>
                      <Td>{TIPUS_ABSENCIA_LABELS[a.tipus]}</Td>
                      <Td>{formatDate(a.dataInici)}</Td>
                      <Td>{formatDate(a.dataFi)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <div className="border-t border-slate-100 pt-4">
              <AbsenciaForm treballadorId={t.id} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nòmines</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {t.nomines.length === 0 ? (
              <EmptyState>Sense nòmines.</EmptyState>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Període</Th>
                    <Th>Base</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </Thead>
                <tbody>
                  {t.nomines.map((n) => (
                    <Tr key={n.id}>
                      <Td>{n.periode}</Td>
                      <Td>{formatEur(Number(n.base))}</Td>
                      <Td className="text-right font-medium">{formatEur(Number(n.total))}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <div className="border-t border-slate-100 pt-4">
              <NominaForm treballadorId={t.id} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
