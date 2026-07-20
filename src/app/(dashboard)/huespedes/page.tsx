import Link from 'next/link';
import { Search, AlertTriangle, Ban, PawPrint, User, Star } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paginacio } from '@/components/ui/paginacio';
import { AvisosPanel } from '@/components/huesped/avisos-panel';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

// El color de l'avatar indica l'estat actual del client:
//  verd = hi és ara · taronja = hi és amb fiança (no oficial) · vermell = no hi és.
const STATUS_COLOR = {
  verd: 'bg-emerald-100 text-emerald-700',
  taronja: 'bg-amber-100 text-amber-700',
  vermell: 'bg-rose-100 text-rose-700',
} as const;
type EstatClient = keyof typeof STATUS_COLOR;

function Inicials({ nom, cognom, estat }: { nom: string; cognom: string; estat: EstatClient }) {
  const ini = (nom[0] ?? '') + (cognom[0] ?? '');
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ${STATUS_COLOR[estat]}`}>
      {ini}
    </span>
  );
}

export default async function HuespedesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mascota?: string; pagina?: string; perPagina?: string }>;
}) {
  const { q, mascota, pagina: paginaStr, perPagina: perPaginaStr } = await searchParams;
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

  const perPagina = [10, 25, 50].includes(Number(perPaginaStr)) ? Number(perPaginaStr) : 25;
  const pagina = Math.max(1, Number(paginaStr) || 1);
  const total = await prisma.huesped.count({ where });
  const now = new Date();

  const huespedes = await prisma.huesped.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    skip: (pagina - 1) * perPagina,
    take: perPagina,
    include: {
      _count: { select: { estancies: { where: { estancia: { deletedAt: null } } } } },
      anotacions: { where: { noAcollir: true, deletedAt: null }, select: { id: true }, take: 1 },
      animals: { where: { deletedAt: null }, select: { id: true }, take: 1 },
      // Estades que cobreixen AVUI (per pintar l'estat: verd/taronja/vermell) +
      // si tenen una fiança en custòdia (→ "no oficial", taronja).
      estancies: {
        where: {
          estancia: { deletedAt: null, estat: { not: 'CANCELLADA' }, dataEntrada: { lte: now }, dataSortida: { gt: now } },
        },
        select: { estancia: { select: { diposits: { where: { estat: 'EN_CUSTODIA' }, select: { id: true }, take: 1 } } } },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${total} persones registrades`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/valoracions">
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4" /> Valoracions
              </Button>
            </Link>
            <Link href="/avisos">
              <Button variant="outline" size="sm">
                <AlertTriangle className="h-4 w-4" /> Avisos interns
              </Button>
            </Link>
          </div>
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

      {/* Llegenda del color de l'avatar */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Hi és ara</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Hi és amb fiança</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> No hi és</span>
      </div>

      {huespedes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <User className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">No s&apos;ha trobat cap client.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {huespedes.map((h) => {
            const estaAra = h.estancies.length > 0;
            const teFianca = h.estancies.some((ev) => ev.estancia.diposits.length > 0);
            const estat: EstatClient = estaAra ? (teFianca ? 'taronja' : 'verd') : 'vermell';
            return (
            <Link key={h.id} href={`/huespedes/${h.id}`}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md">
              <Inicials nom={h.nom} cognom={h.cognom1} estat={estat} />
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
            );
          })}
        </div>
      )}
      <Paginacio total={total} pagina={pagina} perPagina={perPagina} />
    </div>
  );
}
