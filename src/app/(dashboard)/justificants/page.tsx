import { FileSignature, FileCheck, AlertTriangle } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { Paginacio } from '@/components/ui/paginacio';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SilenciarAvis } from '@/components/estancia/silenciar-avis';
import { EliminarComprovant } from '@/components/estancia/eliminar-comprovant';
import { EliminarEstada } from '@/components/estancia/eliminar-estada';
import { EnviarCorreuButton } from '@/components/justificants/enviar-correu-button';
import { FitxaExpandible } from '@/components/justificants/fitxa-expandible';
import { JustificantsFiltres } from '@/components/justificants/justificants-filtres';
import { buildParteFromDb } from '@/lib/mossos/build-parte';
import { validaParteErrors } from '@/lib/mossos/fitxer';
import { ESTAT_ENVIAMENT_LABELS } from '@/lib/validation/enums';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function JustificantsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; paginaMossos?: string; perPagina?: string; any?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const paginaMossos = Math.max(1, Number(sp.paginaMossos) || 1);
  const perPagina = [10, 25, 50].includes(Number(sp.perPagina)) ? Number(sp.perPagina) : 10;

  // Filtre per any/mes: acota el rang de dates de les dues llistes.
  const anyNum = Number(sp.any) || null;
  const mesNum = Number(sp.mes) || null;
  let rang: { gte: Date; lte: Date } | null = null;
  if (anyNum) {
    if (mesNum) {
      rang = {
        gte: new Date(anyNum, mesNum - 1, 1, 0, 0, 0, 0),
        lte: new Date(anyNum, mesNum, 0, 23, 59, 59, 999),
      };
    } else {
      rang = {
        gte: new Date(anyNum, 0, 1, 0, 0, 0, 0),
        lte: new Date(anyNum, 11, 31, 23, 59, 59, 999),
      };
    }
  }

  const whereFitxes: Prisma.EstanciaWhereInput = {
    deletedAt: null,
    ...(rang ? { dataEntrada: rang } : {}),
  };
  const whereMossos: Prisma.EnviamentMossosWhereInput = {
    estat: { in: ['ENVIAT', 'ACCEPTAT'] },
    ...(rang ? { createdAt: rang } : {}),
  };

  const [establiment, totalFitxes, totalMossos, estancies, enviaments] = await Promise.all([
    prisma.establiment.findFirst(),
    prisma.estancia.count({ where: whereFitxes }),
    prisma.enviamentMossos.count({ where: whereMossos }),
    prisma.estancia.findMany({
      where: whereFitxes,
      orderBy: { dataFormalitzacio: 'desc' },
      skip: (pagina - 1) * perPagina,
      take: perPagina,
      include: {
        viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
        enviaments: {
          where: { estat: { in: ['ENVIAT', 'ACCEPTAT'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.enviamentMossos.findMany({
      where: whereMossos,
      orderBy: { createdAt: 'desc' },
      skip: (paginaMossos - 1) * perPagina,
      take: perPagina,
      include: {
        estancia: {
          include: {
            viatgers: { where: { esTitular: true }, include: { huesped: true } },
          },
        },
      },
    }),
  ]);

  const fitxes = estancies.map((e) => {
    const titular = e.viatgers.find((v) => v.esTitular)?.huesped ?? e.viatgers[0]?.huesped ?? null;
    let faltes: string[] = [];
    if (establiment) {
      try { faltes = validaParteErrors(buildParteFromDb(establiment, e, e.viatgers)); } catch { faltes = []; }
    }
    return { e, titular, faltes };
  });
  const nPendents = fitxes.filter((f) => f.faltes.length > 0 && !f.e.avisDadesParat).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Justificants"
        subtitle="Comprovants de Mossos i fitxes de registre"
        actions={<JustificantsFiltres anyActual={new Date().getFullYear()} />}
      />

      {nPendents > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Hi ha <strong>{nPendents}</strong>{' '}
            {nPendents === 1 ? 'fitxa amb dades pendents' : 'fitxes amb dades pendents'} (camps
            obligatoris *). Completa-les o silencia l&apos;avís si no pots obtenir aquelles dades.
          </p>
        </div>
      )}

      {/* ── Fitxes de registre ─────────────────────────────────────────── */}
      <CollapsibleCard
        title="Fitxes de registre"
        icon={<FileSignature className="h-4 w-4 text-brand-600" />}
        count={totalFitxes}
        defaultOpen
      >
        <div>
          {fitxes.length === 0 ? (
            <EmptyState>Encara no hi ha estades.</EmptyState>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Titular / contracte</Th>
                  <Th>Dates</Th>
                  <Th>Estat</Th>
                  <Th className="text-right">Fitxa</Th>
                </tr>
              </Thead>
              <tbody>
                {fitxes.map(({ e, titular, faltes }) => {
                  const pendents = faltes.length > 0;
                  const mostraAvis = pendents && !e.avisDadesParat;
                  return (
                    <Tr key={e.id}>
                      <Td>
                        <FitxaExpandible
                          estanciaId={e.id}
                          titular={titular ? `${titular.nom} ${titular.cognom1}` : '—'}
                          numContracte={e.numContracte}
                          anyContracte={e.anyContracte}
                          viatgers={e.viatgers.filter(v => v.huesped).map(v => ({
                            id: v.huesped!.id,
                            nom: v.huesped!.nom,
                            cognom1: v.huesped!.cognom1,
                            cognom2: v.huesped?.cognom2 ?? null,
                            esTitular: v.esTitular,
                          }))}
                        />
                      </Td>
                      <Td className="text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(e.dataEntrada)} – {formatDate(e.dataSortida)}
                      </Td>
                      <Td>
                        {!pendents ? (
                          <Badge tone="success">Completa</Badge>
                        ) : mostraAvis ? (
                          <Badge tone="warning" title={faltes.join('\n')}>
                            Pendents ({faltes.length})
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Avís silenciat</Badge>
                        )}
                        {pendents && (
                          <span className="ml-1">
                            <SilenciarAvis estanciaId={e.id} parat={e.avisDadesParat} />
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/api/estancies/${e.id}/fitxa-pdf`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm">
                              <FileSignature className="h-4 w-4" /> Fitxa PDF
                            </Button>
                          </a>
                          <a href={`/imprimir/registre/${e.id}`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm">
                              <FileSignature className="h-4 w-4" /> Llibre registre
                            </Button>
                          </a>
                          <EnviarCorreuButton apiUrl={`/api/estancies/${e.id}/fitxa-email`} />
                          <EliminarEstada
                            id={e.id}
                            contracte={`${e.numContracte}/${e.anyContracte}`}
                            comunicada={e.enviaments.length > 0}
                            redirectTo={null}
                            iconOnly
                          />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <Paginacio total={totalFitxes} pagina={pagina} perPagina={perPagina} className="px-1 pb-1" />
        </div>
      </CollapsibleCard>

      {/* ── Comprovants de Mossos ──────────────────────────────────────── */}
      <CollapsibleCard
        title="Comprovants de Mossos"
        icon={<FileCheck className="h-4 w-4 text-brand-600" />}
        count={totalMossos}
        defaultOpen
      >
        <div>
          {enviaments.length === 0 ? (
            <EmptyState>Encara no s&apos;ha comunicat cap estada a Mossos.</EmptyState>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Fitxer</Th>
                  <Th>Titular</Th>
                  <Th>Estat</Th>
                  <Th>Data</Th>
                  <Th className="text-right">Comprovant</Th>
                </tr>
              </Thead>
              <tbody>
                {enviaments.map((env) => {
                  const titular = env.estancia.viatgers[0]?.huesped ?? null;
                  const estatLabel = ESTAT_ENVIAMENT_LABELS[env.estat as keyof typeof ESTAT_ENVIAMENT_LABELS] ?? env.estat;
                  return (
                    <Tr key={env.id}>
                      <Td className="font-medium text-slate-800">{env.fitxerNom}</Td>
                      <Td>{titular ? `${titular.nom} ${titular.cognom1}` : '—'}</Td>
                      <Td>
                        <Badge tone={env.estat === 'ACCEPTAT' ? 'success' : 'info'}>
                          {estatLabel}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap">{env.dataEnviament ? formatDate(env.dataEnviament) : '—'}</Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/api/enviaments/${env.id}/justificant`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm">
                              <FileCheck className="h-4 w-4" /> PDF
                            </Button>
                          </a>
                          <EnviarCorreuButton apiUrl={`/api/enviaments/${env.id}/email`} />
                          <EliminarComprovant id={env.id} fitxerNom={env.fitxerNom} />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <Paginacio
            total={totalMossos}
            pagina={paginaMossos}
            perPagina={perPagina}
            paramName="paginaMossos"
            className="px-1 pb-1"
          />
        </div>
      </CollapsibleCard>
    </div>
  );
}
