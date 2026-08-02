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
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// El color de l'avatar indica com es paga l'estada actual del client:
//  verd = hi és ara (només oficial) · taronja = hi és amb fiança · vermell = no hi és ·
//  partit (mig verd/mig groc) = paga part oficial i part amb fiança.
const STATUS_COLOR = {
  verd: 'bg-emerald-100 text-emerald-700',
  taronja: 'bg-amber-100 text-amber-700',
  vermell: 'bg-rose-100 text-rose-700',
} as const;
type EstatClient = keyof typeof STATUS_COLOR | 'mixt';

const STATUS_TITLE: Record<EstatClient, string> = {
  verd: 'Hi és ara',
  taronja: 'Hi és amb fiança',
  vermell: 'No hi és',
  mixt: 'Hi és ara · part oficial i part amb fiança',
};

// Fons partit en diagonal: meitat verd (oficial), meitat groc (fiança).
const MIXT_BG = 'linear-gradient(135deg, #d1fae5 0 50%, #fef3c7 50% 100%)';

function Inicials({ nom, cognom, estat }: { nom: string; cognom: string; estat: EstatClient }) {
  const ini = (nom[0] ?? '') + (cognom[0] ?? '');
  const base = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase';
  if (estat === 'mixt') {
    return (
      <span className={`${base} text-slate-700`} style={{ background: MIXT_BG }} title={STATUS_TITLE.mixt}>
        {ini}
      </span>
    );
  }
  return (
    <span className={`${base} ${STATUS_COLOR[estat]}`} title={STATUS_TITLE[estat]}>
      {ini}
    </span>
  );
}

export default async function HuespedesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mascota?: string; estat?: string; pagina?: string; perPagina?: string }>;
}) {
  const { q, mascota, estat, pagina: paginaStr, perPagina: perPaginaStr } = await searchParams;
  const nomesMascota = mascota === '1';
  const estatFiltre = estat === 'presents' || estat === 'absents' ? estat : '';
  const now = new Date();

  const where: Prisma.HuespedWhereInput = { deletedAt: null };
  if (nomesMascota) where.animals = { some: { deletedAt: null } };
  // Filtre "hi són ara" / "no hi són": segons si tenen una estada que cobreix avui.
  const estadaActiva: Prisma.EstanciaViatgerWhereInput = {
    estancia: { deletedAt: null, estat: { not: 'CANCELLADA' }, dataEntrada: { lte: now }, dataSortida: { gt: now } },
  };
  if (estatFiltre === 'presents') where.estancies = { some: estadaActiva };
  else if (estatFiltre === 'absents') where.NOT = { estancies: { some: estadaActiva } };
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

  // Construeix un href conservant la cerca i la mascota, canviant l'estat.
  const hrefEstat = (e: string) => {
    const p = new URLSearchParams();
    if (q?.trim()) p.set('q', q);
    if (nomesMascota) p.set('mascota', '1');
    if (e) p.set('estat', e);
    const s = p.toString();
    return `/huespedes${s ? `?${s}` : ''}`;
  };

  const perPagina = [10, 25, 50].includes(Number(perPaginaStr)) ? Number(perPaginaStr) : 25;
  const pagina = Math.max(1, Number(paginaStr) || 1);
  const total = await prisma.huesped.count({ where });

  const huespedes = await prisma.huesped.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    skip: (pagina - 1) * perPagina,
    take: perPagina,
    include: {
      _count: { select: { estancies: { where: { estancia: { deletedAt: null } } } } },
      anotacions: { where: { noAcollir: true, deletedAt: null }, select: { id: true }, take: 1 },
      animals: { where: { deletedAt: null }, select: { id: true }, take: 1 },
      // Estades que cobreixen AVUI (per pintar l'estat). El color depèn de com es
      // paga aquesta estada: si té alguna fiança/dipòsit (→ taronja) i/o algun
      // cobrament oficial (→ verd). Amb les dues coses, avatar partit.
      estancies: {
        where: {
          estancia: { deletedAt: null, estat: { not: 'CANCELLADA' }, dataEntrada: { lte: now }, dataSortida: { gt: now } },
        },
        select: {
          estancia: {
            select: {
              diposits: { select: { id: true }, take: 1 },
              cobraments: { select: { id: true }, take: 1 },
            },
          },
        },
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
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        {estatFiltre && <input type="hidden" name="estat" value={estatFiltre} />}
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

      {/* Filtre: tots / hi són ara / no hi són */}
      <div className="mb-6 inline-flex rounded-lg border border-slate-200 p-0.5 text-sm">
        {[
          { k: '', l: 'Tots' },
          { k: 'presents', l: 'Hi són ara' },
          { k: 'absents', l: 'No hi són' },
        ].map((t) => (
          <Link
            key={t.k}
            href={hrefEstat(t.k)}
            className={cn(
              'rounded-md px-3 py-1 font-medium transition-colors',
              estatFiltre === t.k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {t.l}
          </Link>
        ))}
      </div>

      {/* Llegenda del color de l'avatar */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Hi és ara</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Hi és amb fiança</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'linear-gradient(135deg,#34d399 0 50%,#fbbf24 50% 100%)' }} /> Part oficial, part fiança</span>
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
            const teOficial = h.estancies.some((ev) => ev.estancia.cobraments.length > 0);
            const estat: EstatClient = !estaAra
              ? 'vermell'
              : teFianca && teOficial
              ? 'mixt'
              : teFianca
              ? 'taronja'
              : 'verd';
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
