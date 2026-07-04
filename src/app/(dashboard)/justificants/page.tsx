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
import { EliminarEstada } from '@/components/estancia/eliminar-estada';
import { EnviarCorreuButton } from '@/components/justificants/enviar-correu-button';
import { FitxaExpandible } from '@/components/justificants/fitxa-expandible';
import { JustificantsFiltres } from '@/components/justificants/justificants-filtres';
import { buildParteFromDb } from '@/lib/mossos/build-parte';
import { validaParteErrors } from '@/lib/mossos/fitxer';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function JustificantsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; perPagina?: string; any?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const perPagina = [10, 25, 50].includes(Number(sp.perPagina)) ? Number(sp.perPagina) : 10;

  // Filtre per any/mes: acota el rang de dates.
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

  const where: Prisma.EstanciaWhereInput = {
    deletedAt: null,
    ...(rang ? { dataEntrada: rang } : {}),
  };

  const [establiment, total, estancies] = await Promise.all([
    prisma.establiment.findFirst(),
    prisma.estancia.count({ where }),
    prisma.estancia.findMany({
      where,
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
        subtitle="Fitxes de registre i comprovants de Mossos"
        actions={<JustificantsFiltres anyActual={new Date().getFullYear()} />}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="font-medium text-slate-700">Plantilles en blanc:</span>
        <a href="/api/plantilles-buides?doc=fitxa" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <FileSignature className="h-4 w-4" /> Registre persones allotjades
          </Button>
        </a>
        <a href="/api/plantilles-buides?doc=llibre" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <FileSignature className="h-4 w-4" /> Llibre registre
          </Button>
        </a>
        <span className="ml-1 text-xs text-slate-500">Enviar per correu:</span>
        <EnviarCorreuButton apiUrl="/api/plantilles-buides" />
      </div>

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

      <CollapsibleCard
        title="Registres"
        icon={<FileSignature className="h-4 w-4 text-brand-600" />}
        count={total}
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
                  <Th>Fitxer Mossos</Th>
                  <Th>Estat</Th>
                  <Th className="text-right">Documents</Th>
                </tr>
              </Thead>
              <tbody>
                {fitxes.map(({ e, titular, faltes }) => {
                  const pendents = faltes.length > 0;
                  const mostraAvis = pendents && !e.avisDadesParat;
                  const env = e.enviaments[0]; // darrer enviament a Mossos (si n'hi ha)
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
                        <div className="flex flex-col items-center text-center leading-tight">
                          <span>{formatDate(e.dataEntrada)}</span>
                          <span className="text-slate-400">–</span>
                          <span>{formatDate(e.dataSortida)}</span>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-sm">
                        {env ? (
                          <span className="font-medium text-slate-700">
                            {env.fitxerNom.replace(/^[^.]+\./, '')}
                          </span>
                        ) : (
                          <span className="text-slate-400">— no comunicat</span>
                        )}
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
                            <Button variant="outline" size="sm" className="h-auto py-1.5 whitespace-normal text-center leading-tight">
                              <FileSignature className="h-4 w-4 shrink-0" /> Registre persones allotjades
                            </Button>
                          </a>
                          <a href={`/imprimir/registre/${e.id}`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="h-auto py-1.5 whitespace-normal text-center leading-tight">
                              <FileSignature className="h-4 w-4 shrink-0" /> Llibre registre
                            </Button>
                          </a>
                          {env && (
                            <a href={`/api/enviaments/${env.id}/justificant`} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="h-auto py-1.5 whitespace-normal text-center leading-tight">
                                <FileCheck className="h-4 w-4 shrink-0" /> Comprovant mossos
                              </Button>
                            </a>
                          )}
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
          <Paginacio total={total} pagina={pagina} perPagina={perPagina} className="px-1 pb-1" />
        </div>
      </CollapsibleCard>
    </div>
  );
}
