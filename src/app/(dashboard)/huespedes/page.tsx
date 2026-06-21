import Link from 'next/link';
import { Search } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PageHeader } from '@/components/ui/page-header';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

export default async function HuespedesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where: Prisma.HuespedWhereInput = { deletedAt: null };
  if (q?.trim()) {
    where.OR = [
      { nom: { contains: q, mode: 'insensitive' } },
      { cognom1: { contains: q, mode: 'insensitive' } },
      { cognom2: { contains: q, mode: 'insensitive' } },
      { numDocument: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { telefon: { contains: q, mode: 'insensitive' } },
    ];
  }

  const huespedes = await prisma.huesped.findMany({
    where,
    orderBy: [{ cognom1: 'asc' }, { nom: 'asc' }],
    take: 100,
    include: { _count: { select: { estancies: true } } },
  });

  return (
    <div>
      <PageHeader title="Hostes" subtitle="Fitxa única de cada persona (CRM)" />

      <form method="get" className="mb-4 flex max-w-md gap-2">
        <Input name="q" defaultValue={q ?? ''} placeholder="Cerca per nom, document, email…" />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {huespedes.length === 0 ? (
        <EmptyState>No s’ha trobat cap hoste.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nom</Th>
              <Th>Document</Th>
              <Th>Contacte</Th>
              <Th>Estades</Th>
            </tr>
          </Thead>
          <tbody>
            {huespedes.map((h) => (
              <Tr key={h.id}>
                <Td>
                  <Link href={`/huespedes/${h.id}`} className="font-medium text-slate-900">
                    {h.cognom1} {h.cognom2 ?? ''}, {h.nom}
                  </Link>
                </Td>
                <Td>
                  {h.tipusDocument ? `${TIPUS_DOCUMENT_LABELS[h.tipusDocument]} ` : ''}
                  {h.numDocument ?? '—'}
                </Td>
                <Td>{h.email ?? h.telefon ?? '—'}</Td>
                <Td>{h._count.estancies}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
