import Link from 'next/link';
import { DoorOpen, BedDouble, Sparkles, LogIn } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/table';
import { formatDate, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function titular(viatgers: { huesped: { nom: string; cognom1: string } }[]): string {
  const h = viatgers[0]?.huesped;
  return h ? `${h.nom} ${h.cognom1}` : '—';
}

export default async function HabitacionsPage() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [habitacions, ocupades, netejaPendents, arribades] = await Promise.all([
    prisma.habitacio.findMany({ where: { deletedAt: null }, orderBy: { nom: 'asc' } }),
    prisma.estancia.findMany({
      where: { deletedAt: null, estat: 'EN_CURS', habitacioId: { not: null } },
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true }, take: 1 } },
    }),
    prisma.tascaNeteja.findMany({
      where: { estat: 'PENDENT', data: { gte: dayStart, lte: dayEnd } },
      select: { habitacioId: true, tipus: true },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataEntrada: { gte: dayStart, lte: dayEnd }, habitacioId: { not: null } },
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true }, take: 1 } },
    }),
  ]);

  const ocupMap = new Map(ocupades.filter((e) => e.habitacioId).map((e) => [e.habitacioId!, e]));
  const netejaMap = new Map(netejaPendents.filter((t) => t.habitacioId).map((t) => [t.habitacioId!, t.tipus]));
  const arribadaMap = new Map(arribades.filter((e) => e.habitacioId).map((e) => [e.habitacioId!, e]));

  const nOcup = habitacions.filter((h) => ocupMap.has(h.id)).length;
  const nNeteja = habitacions.filter((h) => netejaMap.has(h.id)).length;
  const nLliure = habitacions.length - nOcup;

  return (
    <div>
      <PageHeader
        title="Habitacions"
        subtitle={`${nOcup} ocupades · ${nLliure} lliures · ${nNeteja} per netejar · ${formatDate(now)}`}
      />

      {habitacions.length === 0 ? (
        <EmptyState>No hi ha habitacions configurades.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {habitacions.map((h) => {
            const occ = ocupMap.get(h.id);
            const neteja = netejaMap.get(h.id);
            const arribada = !occ ? arribadaMap.get(h.id) : undefined;
            const ocupada = !!occ;

            return (
              <Card
                key={h.id}
                className={cn(
                  'border-l-4',
                  ocupada ? 'border-l-brand-600' : 'border-l-green-500',
                )}
              >
                <CardBody className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <DoorOpen className="h-5 w-5 text-slate-400" /> {h.nom}
                    </span>
                    {ocupada ? (
                      <Badge tone="danger">Ocupada</Badge>
                    ) : (
                      <Badge tone="success">Lliure</Badge>
                    )}
                  </div>

                  {occ ? (
                    <Link href={`/estancies/${occ.id}`} className="block text-sm hover:underline">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <BedDouble className="h-4 w-4 text-slate-400" /> {titular(occ.viatgers)}
                      </span>
                      <span className="text-xs text-slate-500">Surt el {formatDate(occ.dataSortida)}</span>
                    </Link>
                  ) : arribada ? (
                    <Link href={`/estancies/${arribada.id}`} className="flex items-center gap-1.5 text-sm text-amber-700 hover:underline">
                      <LogIn className="h-4 w-4" /> Arribada avui: {titular(arribada.viatgers)}
                    </Link>
                  ) : (
                    <p className="text-sm text-slate-400">Disponible</p>
                  )}

                  {neteja && (
                    <Badge tone="warning" className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Neteja pendent: {neteja === 'CANVI_COMPLET' ? 'sortida (a fons)' : 'repàs'}
                    </Badge>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
