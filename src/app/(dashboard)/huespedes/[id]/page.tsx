import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ban, BedDouble, CalendarCheck, Moon, Pencil } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { NotesPanel } from '@/components/huesped/notes-panel';
import { DocumentsHuesped } from '@/components/huesped/documents-huesped';
import { MascotesPanel } from '@/components/huesped/mascotes-panel';
import { EliminarHoste } from '@/components/huesped/eliminar-hoste';
import { EliminarEstada } from '@/components/estancia/eliminar-estada';
import { formatDate } from '@/lib/utils';
import { nights } from '@/lib/dates';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

const estrelles = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, Math.max(0, 5 - n));

export default async function HuespedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const huesped = await prisma.huesped.findFirst({
    where: { id, deletedAt: null },
    include: {
      estancies: {
        // Només estades NO eliminades: una estada esborrada (soft-delete) no ha
        // de continuar sortint a l'historial ni comptar a les estadístiques.
        where: { estancia: { deletedAt: null } },
        include: {
          estancia: {
            include: {
              enviaments: { select: { estat: true } },
              factures: { where: { deletedAt: null }, select: { id: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      anotacions: { where: { deletedAt: null }, orderBy: { data: 'desc' } },
      documents: { where: { deletedAt: null } },
      animals: { where: { deletedAt: null }, orderBy: { nom: 'asc' } },
    },
  });
  if (!huesped) notFound();

  const user = await getSessionUser();
  const canEdit = user ? hasRole(user.role, ROLES_WRITE) : false;
  const estancies = huesped.estancies.map((ev) => ev.estancia);
  // Valoracions de l'hoste: lligades a alguna de les seves estades (via &e a l'enllaç).
  const estanciaIds = estancies.map((e) => e.id);
  const valoracions = estanciaIds.length
    ? await prisma.valoracio.findMany({
        where: { estanciaId: { in: estanciaIds } },
        orderBy: { createdAt: 'desc' },
      })
    : [];
  const nitsAcumulades = estancies.reduce((a, e) => a + nights(e.dataEntrada, e.dataSortida), 0);
  const dates = estancies.map((e) => e.dataEntrada).sort((a, b) => a.getTime() - b.getTime());
  const noAcollir = huesped.anotacions.some((a) => a.noAcollir);

  const stats = [
    { label: 'Estades', value: estancies.length, icon: BedDouble },
    { label: 'Nits acumulades', value: nitsAcumulades, icon: Moon },
    { label: 'Primera visita', value: formatDate(dates[0]), icon: CalendarCheck },
    { label: 'Última visita', value: formatDate(dates[dates.length - 1]), icon: CalendarCheck },
  ];

  return (
    <div>
      <BackLink fallback="/huespedes">Hostes</BackLink>
      <PageHeader
        title={`${huesped.nom} ${huesped.cognom1} ${huesped.cognom2 ?? ''}`}
        subtitle={
          huesped.tipusDocument
            ? `${TIPUS_DOCUMENT_LABELS[huesped.tipusDocument]} ${huesped.numDocument ?? ''}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            {noAcollir && (
              <Badge tone="danger">
                <Ban className="mr-1 h-3 w-3" /> No acollir
              </Badge>
            )}
            {canEdit && (
              <Link href={`/estancies/nou?hoste=${huesped.id}`}>
                <Button size="sm">
                  <BedDouble className="h-4 w-4" /> Nova estada
                </Button>
              </Link>
            )}
            {canEdit && (
              <Link href={`/huespedes/${huesped.id}/edita`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              </Link>
            )}
            {canEdit && (
              <EliminarHoste
                id={huesped.id}
                nom={`${huesped.nom} ${huesped.cognom1}`}
                visites={estancies.length}
              />
            )}
          </div>
        }
      />

      {noAcollir && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Aquest hoste està marcat com a <strong>no acollir</strong> a la llista interna. Revisa les
          notes objectives abans de decidir. La decisió no pot basar-se en característiques protegides.
        </div>
      )}

      {/* Estadísticas */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardBody className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2.5">
                  <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Contacto / dirección */}
          <Card>
            <CardHeader>
              <CardTitle>Dades de contacte</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase text-slate-400">Email</dt>
                  <dd className="text-sm">{huesped.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-400">Telèfon</dt>
                  <dd className="text-sm">{huesped.telefon ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-400">Nacionalitat</dt>
                  <dd className="text-sm">{huesped.nacionalitat ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs uppercase text-slate-400">Adreça</dt>
                  <dd className="text-sm">
                    {[huesped.adreca, huesped.codiPostal, huesped.municipi ?? huesped.localitat, huesped.provincia, huesped.pais]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {/* Historial de estancias */}
          <Card>
            <CardHeader>
              <CardTitle>Historial d’estades</CardTitle>
            </CardHeader>
            <CardBody>
              {estancies.length === 0 ? (
                <EmptyState>Sense estades.</EmptyState>
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Contracte</Th>
                      <Th>Entrada</Th>
                      <Th>Sortida</Th>
                      <Th>Nits</Th>
                      {canEdit && <Th>Accions</Th>}
                    </tr>
                  </Thead>
                  <tbody>
                    {estancies.map((e) => (
                      <Tr key={e.id}>
                        <Td>
                          <Link href={`/estancies/${e.id}`} className="text-brand-700 hover:underline">
                            {e.numContracte}/{e.anyContracte}
                          </Link>
                        </Td>
                        <Td>{formatDate(e.dataEntrada)}</Td>
                        <Td>{formatDate(e.dataSortida)}</Td>
                        <Td>{nights(e.dataEntrada, e.dataSortida)}</Td>
                        {canEdit && (
                          <Td>
                            <EliminarEstada
                              id={e.id}
                              contracte={`${e.numContracte}/${e.anyContracte}`}
                              comunicada={e.enviaments.some(
                                (x) => x.estat === 'ENVIAT' || x.estat === 'ACCEPTAT',
                              )}
                              nFactures={e.factures.length}
                              redirectTo={null}
                              iconOnly
                            />
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          {/* Valoracions de l'hoste (de la pàgina de benvinguda) */}
          {valoracions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Valoracions ({valoracions.length})</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {valoracions.map((v) => (
                  <div key={v.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-amber-500" title={`${v.puntuacio}/5`}>
                        {estrelles(v.puntuacio)}
                      </span>
                      {v.habitacio && <Badge tone="neutral">Habitació {v.habitacio}</Badge>}
                      <span className="ml-auto text-xs text-slate-400">{formatDate(v.createdAt)}</span>
                    </div>
                    {v.comentari && <p className="mt-1 text-sm text-slate-600">“{v.comentari}”</p>}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Documentos + Anotaciones */}
        <div className="space-y-6">
          <DocumentsHuesped
            huespedId={huesped.id}
            canWrite={canEdit}
            documents={huesped.documents.map((d) => ({
              id: d.id,
              tipus: d.tipus,
              fitxerNom: d.fitxerNom,
              mime: d.mime,
              dataSubida: d.dataSubida.toISOString(),
            }))}
          />

          <MascotesPanel
            title="Mascotes"
            huespedId={huesped.id}
            canWrite={canEdit}
            mascotes={huesped.animals.map((a) => ({ id: a.id, nom: a.nom, especie: a.especie, mida: a.mida }))}
          />

          <NotesPanel
            huespedId={huesped.id}
            canWrite={canEdit}
            notes={huesped.anotacions.map((a) => ({
              id: a.id,
              sentit: a.sentit,
              descripcio: a.descripcio,
              noAcollir: a.noAcollir,
              data: a.data.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
