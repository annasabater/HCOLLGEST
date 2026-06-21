import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Send, Receipt } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EstanciaActions } from '@/components/estancia/estancia-actions';
import { ViatgerFirma } from '@/components/estancia/viatger-firma';
import { FacturaPanel } from '@/components/factura/factura-panel';
import { formatDate } from '@/lib/utils';
import {
  TIPUS_REGISTRE_LABELS,
  TIPUS_PAGAMENT_LABELS,
  TIPUS_DOCUMENT_LABELS,
  PARENTESC_LABELS,
} from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

function Dl({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default async function EstanciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estancia = await prisma.estancia.findFirst({
    where: { id, deletedAt: null },
    include: {
      viatgers: { include: { huesped: true, signatura: true }, orderBy: { esTitular: 'desc' } },
      enviaments: { orderBy: { createdAt: 'desc' } },
      habitacio: true,
      factures: { orderBy: { data: 'desc' } },
    },
  });
  if (!estancia) notFound();

  const titular = estancia.viatgers[0]?.huesped;

  return (
    <div>
      <Link href="/estancies" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Estades
      </Link>
      <PageHeader
        title={titular ? `${titular.nom} ${titular.cognom1}` : 'Estada'}
        subtitle={`Contracte ${estancia.numContracte}/${estancia.anyContracte}`}
        actions={<Badge tone="info">{TIPUS_REGISTRE_LABELS[estancia.tipusRegistre]}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Datos de la estancia */}
          <Card>
            <CardHeader>
              <CardTitle>Dades de l’estada</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Dl label="Entrada" value={formatDate(estancia.dataEntrada)} />
                <Dl label="Sortida" value={formatDate(estancia.dataSortida)} />
                <Dl label="Formalització" value={formatDate(estancia.dataFormalitzacio)} />
                <Dl label="Viatgers" value={estancia.numViatgers} />
                <Dl label="Pagament" value={TIPUS_PAGAMENT_LABELS[estancia.tipusPagament]} />
                <Dl label="Habitació" value={estancia.habitacio?.nom} />
                <Dl label="Internet" value={estancia.teInternet ? 'Sí' : 'No'} />
                <Dl label="Observacions" value={estancia.observacions} />
              </dl>
            </CardBody>
          </Card>

          {/* Viajeros */}
          <Card>
            <CardHeader>
              <CardTitle>Viatgers ({estancia.viatgers.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {estancia.viatgers.map((ev) => {
                const h = ev.huesped;
                return (
                  <div key={ev.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Link href={`/huespedes/${h.id}`} className="font-medium text-slate-900 hover:underline">
                        {h.nom} {h.cognom1} {h.cognom2 ?? ''}
                        {ev.esTitular && <Badge tone="info" className="ml-2">Titular</Badge>}
                        {ev.esMenor && <Badge tone="neutral" className="ml-2">Menor</Badge>}
                      </Link>
                      <ViatgerFirma
                        estanciaId={estancia.id}
                        viatgerId={ev.id}
                        signatura={ev.signatura ? { data: ev.signatura.data, hora: ev.signatura.hora } : null}
                      />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Dl
                        label="Document"
                        value={
                          h.tipusDocument
                            ? `${TIPUS_DOCUMENT_LABELS[h.tipusDocument]} ${h.numDocument ?? ''}`
                            : '—'
                        }
                      />
                      <Dl label="Suport" value={h.numSuport} />
                      <Dl label="Naixement" value={formatDate(h.dataNaixement)} />
                      <Dl label="Nacionalitat" value={h.nacionalitat} />
                      <Dl label="Email" value={h.email} />
                      <Dl label="Telèfon" value={h.telefon} />
                      <Dl
                        label="Adreça"
                        value={[h.adreca, h.codiPostal, h.municipi ?? h.localitat].filter(Boolean).join(', ')}
                      />
                      <Dl label="Parentesc" value={ev.parentesc ? PARENTESC_LABELS[ev.parentesc] : '—'} />
                    </dl>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>

        {/* Mossos + Facturació */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Send className="h-4 w-4 text-brand-600" />
              <CardTitle>Comunicació a Mossos</CardTitle>
            </CardHeader>
            <CardBody>
              <EstanciaActions
                estanciaId={estancia.id}
                enviaments={estancia.enviaments.map((e) => ({
                  id: e.id,
                  estat: e.estat,
                  fitxerNom: e.fitxerNom,
                  seq: e.seq,
                  dataEnviament: e.dataEnviament ? e.dataEnviament.toISOString() : null,
                  codiValidacio: e.codiValidacio,
                  numRegistre: e.numRegistre,
                  errorMsg: e.errorMsg,
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-600" />
              <CardTitle>Facturació</CardTitle>
            </CardHeader>
            <CardBody>
              <FacturaPanel
                estanciaId={estancia.id}
                factures={estancia.factures.map((f) => ({
                  id: f.id,
                  numero: f.numero,
                  total: Number(f.total),
                  estat: f.estat,
                }))}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
