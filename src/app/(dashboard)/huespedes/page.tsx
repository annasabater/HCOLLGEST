import Link from 'next/link';
import { Search, AlertTriangle, Ban, PawPrint, User, Star, Phone, Mail } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paginacio } from '@/components/ui/paginacio';
import { AvisosPanel } from '@/components/huesped/avisos-panel';
import { AutoSubmitCheckbox } from '@/components/ui/auto-submit-checkbox';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';
import { cn } from '@/lib/utils';
import { nomPropi } from '@/lib/nom-propi';

export const dynamic = 'force-dynamic';

// L'estat de cada client surt escrit a la targeta i amb una ratlla de color a
// l'esquerra (com es paga l'estada d'ara):
//  verd = hi és ara (només oficial) · taronja = hi és amb fiança ·
//  partit (verd/taronja) = paga part oficial i part amb fiança · gris = no hi és.
type EstatClient = 'verd' | 'taronja' | 'mixt' | 'fora';

const ESTAT_TEXT: Record<Exclude<EstatClient, 'fora'>, string> = {
  verd: 'Hi és',
  taronja: 'Hi és amb fiança',
  mixt: 'Hi és · part amb fiança',
};
const ESTAT_COLOR: Record<Exclude<EstatClient, 'fora'>, string> = {
  verd: 'text-emerald-700',
  taronja: 'text-amber-700',
  mixt: 'text-emerald-700',
};
// La ratlla de l'esquerra (la mixta, meitat verda i meitat taronja).
const RATLLA: Record<EstatClient, string | undefined> = {
  verd: 'inset 3px 0 0 #16a34a',
  taronja: 'inset 3px 0 0 #d97706',
  mixt: undefined,
  fora: undefined,
};

const dataCurta = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/');

function Inicials({ nom, cognom }: { nom: string; cognom: string }) {
  const ini = (nom.trim()[0] ?? '') + (cognom.trim()[0] ?? '');
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[13px] font-bold uppercase tracking-wide text-brand-700">
      {ini}
    </span>
  );
}

const IconaDoc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
    <rect x="3" y="5" width="18" height="14" /><circle cx="9" cy="12" r="2" /><path d="M14 10h4M14 14h4" />
  </svg>
);

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
              habitacio: { select: { nom: true } },
              diposits: { select: { id: true }, take: 1 },
              cobraments: { select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  // Última estada de cada client de la pàgina (per als que no hi són ara).
  const ultimes = new Map<string, Date>();
  if (huespedes.length > 0) {
    const evs = await prisma.estanciaViatger.findMany({
      where: {
        huespedId: { in: huespedes.map((h) => h.id) },
        estancia: { deletedAt: null, estat: { not: 'CANCELLADA' } },
      },
      select: { huespedId: true, estancia: { select: { dataSortida: true, dataEntrada: true } } },
    });
    for (const ev of evs) {
      const d = ev.estancia.dataSortida ?? ev.estancia.dataEntrada;
      if (!d) continue;
      const ant = ultimes.get(ev.huespedId);
      if (!ant || d > ant) ultimes.set(ev.huespedId, d);
    }
  }

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

      {/* Fila 1: cerca (la lupa dins el camp; Enter cerca) + filtre d'estat + mascota. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form method="get" className="relative w-full max-w-sm sm:flex-1">
          {estatFiltre && <input type="hidden" name="estat" value={estatFiltre} />}
          {nomesMascota && <input type="hidden" name="mascota" value="1" />}
          <button type="submit" aria-label="Cercar" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-700">
            <Search className="h-4 w-4" />
          </button>
          <Input name="q" defaultValue={q ?? ''} placeholder="Cerca per nom, document, email…" className="pl-9" />
        </form>

        {/* Filtre: tots / hi són ara / no hi són, amb el color de cada estat. */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {[
            { k: '', l: 'Tots', dot: null },
            { k: 'presents', l: 'Hi són ara', dot: 'bg-emerald-400' },
            { k: 'absents', l: 'No hi són', dot: 'bg-slate-400' },
          ].map((t) => (
            <Link
              key={t.k}
              href={hrefEstat(t.k)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
                estatFiltre === t.k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {t.dot && <span className={cn('h-2.5 w-2.5 rounded-full', t.dot)} />}
              {t.l}
            </Link>
          ))}
        </div>

        <form method="get">
          {q?.trim() && <input type="hidden" name="q" value={q} />}
          {estatFiltre && <input type="hidden" name="estat" value={estatFiltre} />}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <AutoSubmitCheckbox name="mascota" value="1" defaultChecked={nomesMascota} className="accent-brand-700" />
            <PawPrint className="h-4 w-4 text-slate-400" /> Amb mascota
          </label>
        </form>
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
              ? 'fora'
              : teFianca && teOficial
              ? 'mixt'
              : teFianca
              ? 'taronja'
              : 'verd';
            const hab = h.estancies.find((ev) => ev.estancia.habitacio)?.estancia.habitacio?.nom;
            const ultima = ultimes.get(h.id);
            // Sempre igual: «Martín Infante Guanumen» (encara que estigui desat en majúscules).
            // Cada part per separat: «Diaz Romero, YULY PAOLA» → «Yuly Paola Diaz Romero».
            const nomComplet = [h.nom, h.cognom1, h.cognom2].map((x) => nomPropi(x?.trim().replace(/s+/g, ' ') ?? '')).filter(Boolean).join(' ');
            const contacte = h.telefon || h.email;
            return (
            <Link key={h.id} href={`/huespedes/${h.id}`}
              style={{ boxShadow: RATLLA[estat] }}
              className={cn(
                'group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300',
              )}>
              {estat === 'mixt' && (
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: 'linear-gradient(#16a34a 0 50%, #d97706 50% 100%)' }} />
              )}
              <Inicials nom={nomComplet} cognom={nomPropi(h.cognom1)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-bold text-slate-900 group-hover:text-brand-700">{nomComplet}</p>
                  <span className="shrink-0 text-xs text-slate-500">
                    {h._count.estancies} {h._count.estancies === 1 ? 'estada' : 'estades'}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-[12.5px] text-slate-500">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <IconaDoc />
                    <span className="truncate">
                      {h.tipusDocument ? `${TIPUS_DOCUMENT_LABELS[h.tipusDocument]} ` : ''}
                      {h.numDocument ?? '—'}
                    </span>
                  </span>
                  {contacte && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      {h.telefon ? <Phone className="h-3.5 w-3.5 shrink-0" /> : <Mail className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{contacte}</span>
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {estat === 'fora' ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {ultima ? `Última estada ${dataCurta(ultima)}` : 'Sense estades'}
                    </span>
                  ) : (
                    <span className={cn('text-[11px] font-bold uppercase tracking-[0.12em]', ESTAT_COLOR[estat])}>
                      {ESTAT_TEXT[estat]}{hab ? ` · Hab. ${hab}` : ''}
                    </span>
                  )}
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
