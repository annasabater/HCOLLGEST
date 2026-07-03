import Link from 'next/link';
import { Plus, CalendarArrowUp, CalendarArrowDown, Users, BedDouble } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paginacio } from '@/components/ui/paginacio';
import { formatDate } from '@/lib/utils';
import { ESTAT_ENVIAMENT_LABELS } from '@/lib/validation/enums';
import type { EstatEnviament, EstatEstancia } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ESTAT_CONFIG: Record<EstatEstancia, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning'; dot: string }> = {
  RESERVA:     { label: 'Reserva',      tone: 'info',    dot: 'bg-sky-400'    },
  EN_CURS:     { label: 'En curs',      tone: 'warning', dot: 'bg-amber-400'  },
  FINALITZADA: { label: 'Finalitzada',  tone: 'success', dot: 'bg-green-400'  },
  CANCELLADA:  { label: 'Cancel·lada', tone: 'neutral', dot: 'bg-slate-300'  },
};

const ENV_TONE: Record<EstatEnviament, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDENT: 'warning', ENVIAT: 'info', ACCEPTAT: 'success', REBUTJAT: 'danger', ERROR: 'danger',
};

const BORDER_COLOR: Record<EstatEstancia, string> = {
  RESERVA:     'border-l-sky-400',
  EN_CURS:     'border-l-amber-400',
  FINALITZADA: 'border-l-green-400',
  CANCELLADA:  'border-l-slate-300',
};

function Initials({ nom }: { nom: string }) {
  const parts = nom.trim().split(' ');
  const ini = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold uppercase text-brand-700">
      {ini}
    </span>
  );
}

export default async function EstanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ estat?: string; pagina?: string; perPagina?: string }>;
}) {
  const { estat, pagina: paginaStr, perPagina: perPaginaStr } = await searchParams;

  const estatFilter = estat && ['RESERVA', 'EN_CURS', 'FINALITZADA', 'CANCELLADA'].includes(estat)
    ? (estat as EstatEstancia)
    : undefined;

  const perPagina = [10, 25, 50].includes(Number(perPaginaStr)) ? Number(perPaginaStr) : 25;
  const pagina = Math.max(1, Number(paginaStr) || 1);
  const where = { deletedAt: null as null, ...(estatFilter ? { estat: estatFilter } : {}) };
  const total = await prisma.estancia.count({ where });

  const estancies = await prisma.estancia.findMany({
    where,
    orderBy: { dataEntrada: 'desc' },
    skip: (pagina - 1) * perPagina,
    take: perPagina,
    include: {
      viatgers: { where: { esTitular: true }, include: { huesped: true } },
      enviaments: { orderBy: { createdAt: 'desc' }, take: 1 },
      habitacio: true,
    },
  });

  const comptes = await prisma.estancia.groupBy({
    by: ['estat'],
    where: { deletedAt: null },
    _count: true,
  });
  const comptesMap = Object.fromEntries(comptes.map((c) => [c.estat, c._count]));

  const tabs: { key: string; label: string; count?: number }[] = [
    { key: '', label: 'Totes', count: comptes.reduce((a, c) => a + c._count, 0) },
    { key: 'EN_CURS', label: 'En curs', count: comptesMap['EN_CURS'] },
    { key: 'RESERVA', label: 'Reserva', count: comptesMap['RESERVA'] },
    { key: 'FINALITZADA', label: 'Finalitzada', count: comptesMap['FINALITZADA'] },
    { key: 'CANCELLADA', label: 'Cancel·lada', count: comptesMap['CANCELLADA'] },
  ];

  return (
    <div>
      <PageHeader
        title="Estades"
        subtitle={`${total} estades`}
        actions={
          <Link href="/estancies/nou">
            <Button><Plus className="h-4 w-4" /> Nova estada</Button>
          </Link>
        }
      />

      {/* Tabs de filtre */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = (estat ?? '') === tab.key;
          const href = tab.key ? `/estancies?estat=${tab.key}` : '/estancies';
          return (
            <Link key={tab.key} href={href}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {estancies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <BedDouble className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">
            Encara no hi ha estades.{' '}
            <Link href="/estancies/nou" className="font-medium text-brand-700 underline">Crea la primera</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {estancies.map((e) => {
            const titular = e.viatgers[0]?.huesped;
            const nomTitular = titular ? `${titular.nom} ${titular.cognom1}` : '—';
            const env = e.enviaments[0];
            const cfg = ESTAT_CONFIG[e.estat];

            return (
              <Link key={e.id} href={`/estancies/${e.id}`}
                className={`group flex items-center gap-4 rounded-2xl border border-l-4 border-slate-200 bg-white px-4 py-3.5 transition-all hover:shadow-md hover:border-slate-300 ${BORDER_COLOR[e.estat]}`}>

                <Initials nom={nomTitular} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 group-hover:text-brand-700 truncate">
                      {nomTitular}
                    </span>
                    <span className="text-xs text-slate-400">
                      {e.numContracte}/{e.anyContracte}
                    </span>
                    <Badge tone={cfg.tone}>{cfg.label}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarArrowUp className="h-3.5 w-3.5" />{formatDate(e.dataEntrada)}
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="flex items-center gap-1">
                      <CalendarArrowDown className="h-3.5 w-3.5" />{formatDate(e.dataSortida)}
                    </span>
                    {e.habitacio && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" /> Hab. {e.habitacio.nom}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {e.numViatgers}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {env
                    ? <Badge tone={ENV_TONE[env.estat]}>{ESTAT_ENVIAMENT_LABELS[env.estat]}</Badge>
                    : <Badge tone="warning">Sense enviar</Badge>}
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
