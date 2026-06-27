import Link from 'next/link';
import { Search, AlertTriangle, Ban, PawPrint, User } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvisosPanel } from '@/components/huesped/avisos-panel';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

const COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

function avatarColor(nom: string) {
  const code = nom.charCodeAt(0) + (nom.charCodeAt(1) || 0);
  return COLORS[code % COLORS.length];
}

function Inicials({ nom, cognom }: { nom: string; cognom: string }) {
  const ini = (nom[0] ?? '') + (cognom[0] ?? '');
  const color = avatarColor(cognom);
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ${color}`}>
      {ini}
    </span>
  );
}

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
      _count: { select: { estancies: { where: { estancia: { deletedAt: null } } } } },
      anotacions: { where: { noAcollir: true, deletedAt: null }, select: { id: true }, take: 1 },
      animals: { where: { deletedAt: null }, select: { id: true }, take: 1 },
    },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${huespedes.length} persones registrades`}
        actions={
          <Link href="/avisos">
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4" /> Avisos interns
            </Button>
          </Link>
        }
      />

      <AvisosPanel />

      {/* Cerca */}
      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={q ?? ''} placeholder="Cerca per nom, document, email…" className="pl-9" />
        </div>
        <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
          <input type="checkbox" name="mascota" value="1" defaultChecked={nomesMascota} className="accent-brand-700" />
          <PawPrint className="h-4 w-4 text-slate-400" /> Amb mascota
        </label>
      </form>

      {huespedes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <User className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">No s&apos;ha trobat cap client.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {huespedes.map((h) => (
            <Link key={h.id} href={`/huespedes/${h.id}`}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md">
              <Inicials nom={h.nom} cognom={h.cognom1} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-slate-900 group-hover:text-brand-700">
                  {h.cognom1} {h.cognom2 ?? ''}, {h.nom}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  {h.tipusDocument ? `${TIPUS_DOCUMENT_LABELS[h.tipusDocument]} ` : ''}
                  {h.numDocument ?? '—'}
                </p>
                {(h.email || h.telefon) && (
                  <p className="mt-0.5 text-xs text-slate-400 truncate">{h.email ?? h.telefon}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {h._count.estancies} {h._count.estancies === 1 ? 'estada' : 'estades'}
                  </span>
                  {h.anotacions.length > 0 && (
                    <Badge tone="danger"><Ban className="mr-1 h-3 w-3" />No acollir</Badge>
                  )}
                  {h.animals.length > 0 && (
                    <Badge tone="neutral"><PawPrint className="mr-1 h-3 w-3" />Mascota</Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
