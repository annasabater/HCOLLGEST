import Link from 'next/link';
import { Search, AlertTriangle, Ban, PawPrint } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PageHeader } from '@/components/ui/page-header';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

export default async function HuespedesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mascota?: string }>;
}) {
  const { q, mascota } = await searchParams;
  const nomesMascota = mascota === '1';
  const where: Prisma.HuespedWhereInput = { deletedAt: null };
  if (nomesMascota) where.animals = { some: { deletedAt: null } };
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
    include: {
      // Només estades NO eliminades (el join estancia_viatger es manté en soft-delete).
      _count: { select: { estancies: { where: { estancia: { deletedAt: null } } } } },
      anotacions: { where: { noAcollir: true, deletedAt: null }, select: { id: true }, take: 1 },
      animals: { where: { deletedAt: null }, select: { id: true }, take: 1 },
    },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Fitxa única de cada persona"
        actions={
          <Link href="/avisos">
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4" /> Avisos interns
            </Button>
          </Link>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q ?? ''} placeholder="Cerca per nom, document, email…" className="max-w-xs" />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
        <label className="ml-2 flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" name="mascota" value="1" defaultChecked={nomesMascota} />
          <PawPrint className="h-4 w-4 text-slate-400" /> Només amb mascota
        </label>
      </form>

      {huespedes.length === 0 ? (
        <EmptyState>No s’ha trobat cap client.</EmptyState>
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
                  {h.anotacions.length > 0 && (
                    <Badge tone="danger" className="ml-2">
                      <Ban className="mr-1 h-3 w-3" /> No acollir
                    </Badge>
                  )}
                  {h.animals.length > 0 && (
                    <Badge tone="neutral" className="ml-2">
                      <PawPrint className="mr-1 h-3 w-3" /> Mascota
                    </Badge>
                  )}
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
