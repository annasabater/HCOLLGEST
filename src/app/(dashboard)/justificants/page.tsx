import Link from 'next/link';
import { FileSignature, FileCheck, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SilenciarAvis } from '@/components/estancia/silenciar-avis';
import { buildParteFromDb } from '@/lib/mossos/build-parte';
import { validaParteErrors } from '@/lib/mossos/fitxer';
import { ESTAT_ENVIAMENT_LABELS } from '@/lib/validation/enums';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function JustificantsPage() {
  const [establiment, estancies] = await Promise.all([
    prisma.establiment.findFirst(),
    prisma.estancia.findMany({
      where: { deletedAt: null },
      orderBy: { dataEntrada: 'desc' },
      take: 300,
      include: {
        viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
        enviaments: {
          where: { estat: { in: ['ENVIAT', 'ACCEPTAT'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
  ]);

  // Per cada estada: titular, dades que falten (camps obligatoris *, §2.3).
  const fitxes = estancies.map((e) => {
    const titular = e.viatgers[0]?.huesped ?? null;
    let faltes: string[] = [];
    if (establiment) {
      try {
        faltes = validaParteErrors(buildParteFromDb(establiment, e, e.viatgers));
      } catch {
        faltes = [];
      }
    }
    return { e, titular, faltes };
  });
  const nPendents = fitxes.filter((f) => f.faltes.length > 0 && !f.e.avisDadesParat).length;

  const comprovants = estancies.flatMap((e) =>
    e.enviaments.map((env) => ({ env, titular: e.viatgers[0]?.huesped ?? null })),
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Justificants" subtitle="Comprovants de Mossos i fitxes de registre" />

      {nPendents > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Hi ha <strong>{nPendents}</strong>{' '}
            {nPendents === 1 ? 'fitxa amb dades pendents' : 'fitxes amb dades pendents'} (camps
            obligatoris *). Completa-les o silencia l’avís si no pots obtenir aquelles dades.
          </p>
        </div>
      )}

      {/* Fitxes de registre */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-brand-600" />
          <CardTitle>Fitxes de registre</CardTitle>
        </CardHeader>
        <CardBody>
          {fitxes.length === 0 ? (
            <EmptyState>Encara no hi ha estades.</EmptyState>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Titular / contracte</Th>
                  <Th>Dates</Th>
                  <Th>Estat de les dades</Th>
                  <Th>Fitxa</Th>
                  <Th></Th>
                </tr>
              </Thead>
              <tbody>
                {fitxes.map(({ e, titular, faltes }) => {
                  const pendents = faltes.length > 0;
                  const mostraAvis = pendents && !e.avisDadesParat;
                  return (
                    <Tr key={e.id}>
                      <Td>
                        <Link href={`/estancies/${e.id}`} className="font-medium text-slate-900">
                          {titular ? `${titular.nom} ${titular.cognom1}` : '—'}
                        </Link>
                        <div className="text-xs text-slate-400">
                          {e.numContracte}/{e.anyContracte}
                        </div>
                      </Td>
                      <Td className="text-sm text-slate-600">
                        {formatDate(e.dataEntrada)} – {formatDate(e.dataSortida)}
                      </Td>
                      <Td>
                        {!pendents ? (
                          <Badge tone="success">Completa</Badge>
                        ) : mostraAvis ? (
                          <Badge tone="warning" title={faltes.join('\n')}>
                            Dades pendents ({faltes.length})
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Avís silenciat</Badge>
                        )}
                      </Td>
                      <Td>
                        <a href={`/api/estancies/${e.id}/fitxa-pdf`} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <FileSignature className="h-4 w-4" /> Fitxa PDF
                          </Button>
                        </a>
                      </Td>
                      <Td>{pendents && <SilenciarAvis estanciaId={e.id} parat={e.avisDadesParat} />}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Comprovants de Mossos */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-brand-600" />
          <CardTitle>Comprovants de Mossos</CardTitle>
        </CardHeader>
        <CardBody>
          {comprovants.length === 0 ? (
            <EmptyState>Encara no s’ha comunicat cap estada a Mossos.</EmptyState>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Fitxer</Th>
                  <Th>Titular</Th>
                  <Th>Estat</Th>
                  <Th>Codi validació</Th>
                  <Th>Data</Th>
                  <Th>Comprovant</Th>
                </tr>
              </Thead>
              <tbody>
                {comprovants.map(({ env, titular }) => (
                  <Tr key={env.id}>
                    <Td className="font-medium text-slate-800">{env.fitxerNom}</Td>
                    <Td>{titular ? `${titular.nom} ${titular.cognom1}` : '—'}</Td>
                    <Td>
                      <Badge tone={env.estat === 'ACCEPTAT' ? 'success' : 'info'}>
                        {ESTAT_ENVIAMENT_LABELS[env.estat]}
                      </Badge>
                    </Td>
                    <Td>{env.codiValidacio ?? '—'}</Td>
                    <Td>{env.dataEnviament ? formatDate(env.dataEnviament) : '—'}</Td>
                    <Td>
                      <a href={`/api/enviaments/${env.id}/justificant`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          <FileCheck className="h-4 w-4" /> PDF
                        </Button>
                      </a>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
