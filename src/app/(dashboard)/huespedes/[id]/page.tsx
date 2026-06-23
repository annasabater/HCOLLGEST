import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Ban, BedDouble, CalendarCheck, Moon, Pencil } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { AnotacioForm } from '@/components/huesped/anotacio-form';
import { DocumentsHuesped } from '@/components/huesped/documents-huesped';
import { MascotesPanel } from '@/components/huesped/mascotes-panel';
import { PawPrint } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { nights } from '@/lib/dates';
import { TIPUS_DOCUMENT_LABELS, SENTIT_ANOTACIO_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

export default async function HuespedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const huesped = await prisma.huesped.findFirst({
    where: { id, deletedAt: null },
    include: {
      estancies: { include: { estancia: true }, orderBy: { createdAt: 'desc' } },
      anotacions: { where: { deletedAt: null }, orderBy: { data: 'desc' } },
      documents: { where: { deletedAt: null } },
      animals: { where: { deletedAt: null }, orderBy: { nom: 'asc' } },
    },
  });
  if (!huesped) notFound();

  const user = await getSessionUser();
  const canEdit = user ? hasRole(user.role, ROLES_WRITE) : false;
  const estancies = huesped.estancies.map((ev) => ev.estancia);
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
      <Link href="/huespedes" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Hostes
      </Link>
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
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Documentos + Anotaciones */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents d’identitat</CardTitle>
            </CardHeader>
            <CardBody>
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-brand-600" />
              <CardTitle>Mascotes</CardTitle>
            </CardHeader>
            <CardBody>
              <MascotesPanel
                huespedId={huesped.id}
                canWrite={canEdit}
                mascotes={huesped.animals.map((a) => ({ id: a.id, nom: a.nom, especie: a.especie, mida: a.mida }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes internes</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {huesped.anotacions.length === 0 && (
                <p className="text-sm text-slate-400">Sense notes.</p>
              )}
              {huesped.anotacions.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      tone={a.sentit === 'POSITIVA' ? 'success' : a.sentit === 'NEGATIVA' ? 'danger' : 'neutral'}
                    >
                      {SENTIT_ANOTACIO_LABELS[a.sentit]}
                    </Badge>
                    {a.noAcollir && <Badge tone="danger">No acollir</Badge>}
                    <span className="ml-auto text-xs text-slate-400">{formatDate(a.data)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{a.descripcio}</p>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-4">
                <AnotacioForm huespedId={huesped.id} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
