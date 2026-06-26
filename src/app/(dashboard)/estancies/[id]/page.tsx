import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Send, Receipt, FileSignature, Pencil, Mail } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { MascotesPanel } from '@/components/huesped/mascotes-panel';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { MoreMenu } from '@/components/ui/more-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EstanciaActions } from '@/components/estancia/estancia-actions';
import { ViatgerFirma } from '@/components/estancia/viatger-firma';
import { AmpliarEstada } from '@/components/estancia/ampliar-estada';
import { EliminarEstada } from '@/components/estancia/eliminar-estada';
import { TreureEsborrany } from '@/components/estancia/treure-esborrany';
import { ConvertirAEnCurs } from '@/components/estancia/convertir-a-en-curs';
import { EmailsPanel } from '@/components/estancia/emails-panel';
import { FacturaPanel } from '@/components/factura/factura-panel';
import { PagamentsPanel } from '@/components/factura/pagaments-panel';
import { preuSuggeritAllotjament } from '@/lib/services/tarifes';
import { formatDate } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import {
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
      viatgers: {
        include: {
          huesped: { include: { animals: { where: { deletedAt: null }, orderBy: { nom: 'asc' } } } },
          signatura: true,
        },
        orderBy: { esTitular: 'desc' },
      },
      enviaments: { orderBy: { createdAt: 'desc' } },
      habitacio: true,
      factures: { where: { deletedAt: null }, orderBy: { data: 'desc' } },
      cobraments: { include: { factura: { select: { numero: true } } }, orderBy: { data: 'asc' } },
      diposits: { orderBy: { createdAt: 'desc' } },
      origen: { select: { id: true, numContracte: true, anyContracte: true } },
      ampliacions: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, numContracte: true, dataEntrada: true, dataSortida: true },
      },
    },
  });
  if (!estancia) notFound();

  const habitacions = await prisma.habitacio.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true },
  });

  const user = await getSessionUser();
  const isAdmin = user?.role === 'ADMIN';
  const canWrite = user ? hasRole(user.role, ROLES_WRITE) : false;
  const titular = estancia.viatgers[0]?.huesped;
  const suggerit = isAdmin
    ? await preuSuggeritAllotjament(estancia.habitacioId, estancia.dataEntrada, estancia.dataSortida)
    : null;

  // Estat REAL de l'estada (per dates) — més clar que el tipus de registre Mossos.
  const avuiIso = toISODate(new Date());
  const status: { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' } =
    estancia.esBorrany
      ? { label: 'Esborrany', tone: 'warning' }
      : estancia.estat === 'CANCELLADA'
        ? { label: 'Cancel·lada', tone: 'neutral' }
        : avuiIso < toISODate(estancia.dataEntrada)
          ? { label: 'Reserva', tone: 'info' }
          : avuiIso < toISODate(estancia.dataSortida)
            ? { label: 'Allotjat ara', tone: 'success' }
            : { label: 'Estada acabada', tone: 'neutral' };

  return (
    <div>
      <BackLink fallback="/estancies">Estades</BackLink>
      <PageHeader
        title={titular ? `${titular.nom} ${titular.cognom1}` : 'Estada'}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Contracte {estancia.numContracte}/{estancia.anyContracte}
            </span>
            <Badge
              tone={status.tone}
              title={
                estancia.esBorrany
                  ? 'Registre incomplet: completa les dades per poder pujar-lo a Mossos.'
                  : undefined
              }
            >
              {status.label}
            </Badge>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/estancies/${estancia.id}/fitxa-pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <FileSignature className="h-4 w-4" /> Fitxa PDF
              </Button>
            </a>
            {canWrite && estancia.estat === 'RESERVA' && (
              <ConvertirAEnCurs estanciaId={estancia.id} />
            )}
            <AmpliarEstada
              estanciaId={estancia.id}
              defaultEntrada={toISODate(estancia.dataSortida)}
              habitacions={habitacions}
              actualHabitacioId={estancia.habitacioId}
            />
            {canWrite && (
              <MoreMenu>
                <Link href={`/estancies/${estancia.id}/edita`}>
                  <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                </Link>
                {estancia.esBorrany && <TreureEsborrany estanciaId={estancia.id} />}
                <EliminarEstada
                  id={estancia.id}
                  contracte={`${estancia.numContracte}/${estancia.anyContracte}`}
                  comunicada={estancia.enviaments.some(
                    (e) => e.estat === 'ENVIAT' || e.estat === 'ACCEPTAT',
                  )}
                  nFactures={estancia.factures.length}
                />
              </MoreMenu>
            )}
          </div>
        }
      />

      {(estancia.origen || estancia.ampliacions.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
          {estancia.origen && (
            <span>
              Ampliació de{' '}
              <Link href={`/estancies/${estancia.origen.id}`} className="font-medium text-brand-700">
                {estancia.origen.numContracte}/{estancia.origen.anyContracte}
              </Link>
            </span>
          )}
          {estancia.ampliacions.length > 0 && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Ampliacions:</span>
              {estancia.ampliacions.map((a) => (
                <Link key={a.id} href={`/estancies/${a.id}`}>
                  <Badge tone="info">
                    {a.numContracte} · {formatDate(a.dataEntrada)}–{formatDate(a.dataSortida)}
                  </Badge>
                </Link>
              ))}
            </span>
          )}
        </div>
      )}

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
                <Dl
                  label="Tipus de registre (Mossos)"
                  value={
                    estancia.tipusRegistre === 'RESERVA'
                      ? 'Reserva'
                      : 'Contracte en curs (estada formalitzada)'
                  }
                />
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
                      <div className="flex items-center gap-2">
                        {canWrite && (
                          <Link href={`/huespedes/${h.id}/edita`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" /> Editar dades
                            </Button>
                          </Link>
                        )}
                        <ViatgerFirma
                          estanciaId={estancia.id}
                          viatgerId={ev.id}
                          signatura={ev.signatura ? { data: ev.signatura.data, hora: ev.signatura.hora } : null}
                        />
                      </div>
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

          {/* Mascotes de l'hoste — col·lapsable (plegat si no en té; desplega per afegir) */}
          {titular && (
            <MascotesPanel
              title="Mascotes de l’hoste"
              huespedId={titular.id}
              canWrite={canWrite}
              mascotes={titular.animals.map((a) => ({ id: a.id, nom: a.nom, especie: a.especie, mida: a.mida }))}
            />
          )}

          {/* Pagaments i fiances — sota mascotes, col·lapsable i compacte */}
          {isAdmin && (
            <CollapsibleCard
              title="Pagaments i fiances"
              icon={<Receipt className="h-4 w-4 text-brand-600" />}
              count={estancia.cobraments.length + estancia.diposits.length}
              defaultOpen={estancia.cobraments.length + estancia.diposits.length > 0}
            >
              <PagamentsPanel
                estanciaId={estancia.id}
                numContracte={estancia.numContracte?.toString() ?? null}
                facturesActuals={estancia.factures.map((f) => ({ id: f.id, numero: f.numero }))}
                pagaments={estancia.cobraments.map((c) => ({
                  id: c.id,
                  import: Number(c.import),
                  metode: c.metode,
                  concepte: c.concepte,
                  descripcio: c.descripcio,
                  data: c.data.toISOString(),
                  facturaId: c.facturaId,
                  facturaNumero: c.factura?.numero ?? null,
                }))}
                fiances={estancia.diposits.map((d) => ({
                  id: d.id,
                  import: Number(d.import),
                  data: d.data.toISOString(),
                  metode: d.metode,
                  estat: d.estat,
                  motiu: d.motiu,
                }))}
              />
            </CollapsibleCard>
          )}

          {/* Facturació — sota Pagaments, col·lapsable */}
          {isAdmin && (
            <CollapsibleCard
              title="Facturació"
              icon={<Receipt className="h-4 w-4 text-brand-600" />}
              count={estancia.factures.length}
              defaultOpen={estancia.factures.length > 0}
            >
              <FacturaPanel
                estanciaId={estancia.id}
                preuSuggerit={suggerit?.preu}
                nitsSuggerides={suggerit?.nits}
                habitacioNom={estancia.habitacio?.nom ?? null}
                numViatgers={estancia.numViatgers ?? null}
                dataEntrada={estancia.dataEntrada?.toISOString() ?? null}
                dataSortida={estancia.dataSortida?.toISOString() ?? null}
                numContracte={estancia.numContracte?.toString() ?? null}
                pagaments={estancia.cobraments.map((c) => ({
                  import: Number(c.import),
                  facturaId: c.facturaId,
                }))}
                fiances={estancia.diposits.map((d) => ({
                  import: Number(d.import),
                  estat: d.estat,
                }))}
                factures={estancia.factures.map((f) => ({
                  id: f.id,
                  numero: f.numero,
                  total: Number(f.total),
                  estat: f.estat,
                  tipusDocument: f.tipusDocument,
                }))}
              />
            </CollapsibleCard>
          )}
        </div>

        {/* Mossos */}
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

          {/* Emails programats (benvinguda / gràcies + ressenya) */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-600" />
              <CardTitle>Emails programats</CardTitle>
            </CardHeader>
            <CardBody>
              <EmailsPanel
                estanciaId={estancia.id}
                titularNom={titular ? `${titular.nom} ${titular.cognom1}` : ''}
                titularEmail={titular?.email ?? null}
                titularTelefon={titular?.telefon ?? null}
                habitacioNom={estancia.habitacio?.nom ?? null}
                dataEntrada={estancia.dataEntrada.toISOString()}
                dataSortida={estancia.dataSortida.toISOString()}
                idioma={estancia.idioma ?? 'ca'}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
