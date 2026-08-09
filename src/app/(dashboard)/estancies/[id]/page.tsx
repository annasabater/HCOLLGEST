import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Send, Receipt, FileSignature, Pencil, Mail } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { habitacioLlibre } from '@/lib/habitacio-llibre';
import { formataRebuigMossos } from '@/lib/mossos/errors';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { MascotesPanel } from '@/components/huesped/mascotes-panel';
import { BugaderiaPanel } from '@/components/estancia/bugaderia-panel';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { MoreMenu } from '@/components/ui/more-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EstanciaActions } from '@/components/estancia/estancia-actions';
import { ViatgerFirma } from '@/components/estancia/viatger-firma';
import { AmpliarEstada } from '@/components/estancia/ampliar-estada';
import { FinalitzarAnticipada } from '@/components/estancia/finalitzar-anticipada';
import { EliminarEstada } from '@/components/estancia/eliminar-estada';
import { TreureEsborrany } from '@/components/estancia/treure-esborrany';
import { ConvertirAEnCurs } from '@/components/estancia/convertir-a-en-curs';
import { EmailsPanel } from '@/components/estancia/emails-panel';
import { FacturaPanel } from '@/components/factura/factura-panel';
import { PagamentsPanel } from '@/components/factura/pagaments-panel';
import { formatDate, cn } from '@/lib/utils';
import { toISODate, ageAt } from '@/lib/dates';
import {
  TIPUS_PAGAMENT_LABELS,
  TIPUS_DOCUMENT_LABELS,
  PARENTESC_LABELS,
} from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

function Dl({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="break-words text-sm text-slate-800">{value || '—'}</dd>
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
          habitacioSeparada: { select: { nom: true } },
        },
        orderBy: { esTitular: 'desc' },
      },
      enviaments: { orderBy: { createdAt: 'desc' } },
      habitacio: true,
      factures: { where: { deletedAt: null }, orderBy: { data: 'desc' } },
      cobraments: { include: { factura: { select: { numero: true } }, periodes: true }, orderBy: { data: 'asc' } },
      diposits: { include: { factura: { select: { numero: true } }, periodes: true }, orderBy: { createdAt: 'desc' } },
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

  // Cadena de contractes d'aquesta estada (principal + ampliacions), per navegar
  // entre ells. L'arrel és l'origen (si és ampliació) o la mateixa estada.
  const rootId = estancia.origen?.id ?? estancia.id;
  const cadena = await prisma.estancia.findMany({
    where: { deletedAt: null, OR: [{ id: rootId }, { estanciaOrigenId: rootId }] },
    select: { id: true, numContracte: true, anyContracte: true, dataEntrada: true, dataSortida: true },
    orderBy: [{ dataEntrada: 'asc' }],
  });

  const user = await getSessionUser();
  const isAdmin = user?.role === 'ADMIN';
  const canWrite = user ? hasRole(user.role, ROLES_WRITE) : false;
  const titular = estancia.viatgers[0]?.huesped;
  // Declaració IEET si hi ha algun menor de 17 anys (exempció impost turístic).
  const teMenor = estancia.viatgers.some(
    (v) => v.huesped?.dataNaixement && ageAt(v.huesped.dataNaixement, estancia.dataEntrada ?? new Date()) < 17,
  );

  // Contractes separats: viatgers que als papers consten en una altra habitació.
  // Un per habitació separada (el número és el de l'estada si no en tenen un de propi).
  const contractesSeparats = [...new Map(
    estancia.viatgers
      .filter((v) => v.habitacioSeparada)
      .map((v) => [v.habitacioSeparada!.nom, { hab: v.habitacioSeparada!.nom, num: v.numContracteSeparat ?? estancia.numContracte }]),
  ).values()];
  // Full "principal" (habitació física) NOMÉS si hi ha viatgers que hi consten.
  // Si tots estan reubicats al llibre (p. ex. un sol hoste), no hi ha full
  // principal i així no es dupliquen els botons.
  const teePrincipals = estancia.viatgers.some((v) => !v.habitacioSeparada);
  const fullsDocs = [
    ...(teePrincipals ? [{ hab: 'principal', num: estancia.numContracte }] : []),
    ...contractesSeparats,
  ];
  // Habitació que consta al llibre/factura (pot diferir de la física real).
  const habitacioLlibreEst = habitacioLlibre(estancia);

  // Estat REAL de l'estada (per dates) — més clar que el tipus de registre Mossos.
  const avuiIso = toISODate(new Date());
  const status: { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' } =
    estancia.esBorrany
      ? { label: 'Esborrany', tone: 'warning' }
      : estancia.estat === 'CANCELLADA'
        ? { label: 'Cancel·lada', tone: 'neutral' }
        : estancia.sortidaAnticipada
          ? { label: 'Sortida anticipada', tone: 'warning' }
          : estancia.dataEntrada && avuiIso < toISODate(estancia.dataEntrada)
            ? { label: 'Reserva', tone: 'info' }
            : estancia.dataSortida && avuiIso < toISODate(estancia.dataSortida)
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
              {contractesSeparats.map((c) => (
                <span key={c.hab} className="text-slate-500">
                  {' '}
                  {c.num === estancia.numContracte
                    ? `(Hab. ${c.hab} al llibre)`
                    : `+ ${c.num}/${estancia.anyContracte} (Hab. ${c.hab})`}
                </span>
              ))}
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
            {contractesSeparats.length === 0 ? (
              <>
                <a href={`/api/estancies/${estancia.id}/fitxa-pdf`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <FileSignature className="h-4 w-4" /> Registre persones allotjades
                  </Button>
                </a>
                <a href={`/api/estancies/${estancia.id}/reglament-pdf`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <FileSignature className="h-4 w-4" /> Reglament intern (LOPD)
                  </Button>
                </a>
                <a href={`/imprimir/registre/${estancia.id}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <FileSignature className="h-4 w-4" /> Llibre registre
                  </Button>
                </a>
              </>
            ) : (
              // Un joc de botons per full: el principal (si hi ha) i cada habitació separada.
              fullsDocs.map((c) => (
                <span key={c.hab} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1">
                  <span className="px-1 text-xs font-semibold text-slate-500">{c.num}</span>
                  <a
                    href={`/api/estancies/${estancia.id}/fitxa-pdf?hab=${encodeURIComponent(c.hab)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <FileSignature className="h-4 w-4" /> Registre persones allotjades
                    </Button>
                  </a>
                  <a
                    href={`/api/estancies/${estancia.id}/reglament-pdf?hab=${encodeURIComponent(c.hab)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <FileSignature className="h-4 w-4" /> Reglament (LOPD)
                    </Button>
                  </a>
                  <a
                    href={`/imprimir/registre/${estancia.id}?hab=${encodeURIComponent(c.hab)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <FileSignature className="h-4 w-4" /> Llibre registre
                    </Button>
                  </a>
                </span>
              ))
            )}
            {teMenor && (
              <a href={`/imprimir/ieet-declaracio/${estancia.id}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <FileSignature className="h-4 w-4" /> Declaració IEET (menor)
                </Button>
              </a>
            )}
            {canWrite && estancia.estat === 'RESERVA' && (
              <ConvertirAEnCurs estanciaId={estancia.id} numContracteActual={estancia.numContracte} />
            )}
            <AmpliarEstada
              estanciaId={estancia.id}
              defaultEntrada={estancia.dataSortida ? toISODate(estancia.dataSortida) : ''}
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
                {!estancia.esBorrany && estancia.estat !== 'CANCELLADA' && (
                  <FinalitzarAnticipada
                    estanciaId={estancia.id}
                    dataEntrada={estancia.dataEntrada ? toISODate(estancia.dataEntrada) : null}
                    dataSortidaActual={estancia.dataSortida ? toISODate(estancia.dataSortida) : null}
                    habitacioNom={estancia.habitacio?.nom ?? null}
                    jaAnticipada={estancia.sortidaAnticipada}
                  />
                )}
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

      {cadena.length > 1 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Contractes d’aquesta estada ({cadena.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {cadena.map((c) => {
              const actual = c.id === estancia.id;
              return (
                <Link
                  key={c.id}
                  href={`/estancies/${c.id}`}
                  aria-current={actual ? 'page' : undefined}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 transition-colors',
                    actual
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <div className={cn('flex items-center gap-1.5 text-sm font-medium', actual ? 'text-brand-800' : 'text-slate-700')}>
                    {c.numContracte}/{c.anyContracte}
                    {actual && <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Aquí</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDate(c.dataEntrada)} – {formatDate(c.dataSortida)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Datos de la estancia */}
          <Card>
            <CardHeader>
              <CardTitle>Dades de l’estada</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Dl label="Entrada" value={formatDate(estancia.dataEntrada)} />
                <Dl
                  label={estancia.sortidaAnticipada ? 'Sortida (anticipada)' : 'Sortida'}
                  value={
                    estancia.sortidaAnticipada && estancia.dataSortidaPrevista ? (
                      <span>
                        {formatDate(estancia.dataSortida)}{' '}
                        <span className="text-slate-400">(prevista {formatDate(estancia.dataSortidaPrevista)})</span>
                      </span>
                    ) : (
                      formatDate(estancia.dataSortida)
                    )
                  }
                />

                <Dl label="Formalització" value={formatDate(estancia.dataFormalitzacio)} />
                <Dl label="Viatgers" value={estancia.numViatgers} />
                <Dl label="Pagament" value={TIPUS_PAGAMENT_LABELS[estancia.tipusPagament]} />
                <Dl
                  label="Habitació"
                  value={
                    habitacioLlibreEst && habitacioLlibreEst !== estancia.habitacio?.nom
                      ? `${estancia.habitacio?.nom ?? '—'} · al llibre: ${habitacioLlibreEst}`
                      : estancia.habitacio?.nom
                  }
                />
                <Dl
                  wide
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
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/huespedes/${h.id}`} className="font-medium text-slate-900 hover:underline">
                        {h.nom} {h.cognom1} {h.cognom2 ?? ''}
                        {ev.esTitular && <Badge tone="info" className="ml-2">Titular</Badge>}
                        {ev.esMenor && <Badge tone="neutral" className="ml-2">Menor</Badge>}
                      </Link>
                      <div className="flex items-center gap-2">
                        {canWrite && (
                          <Link href={`/estancies/${estancia.id}/edita#v-${h.id}`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" /> Editar dades
                            </Button>
                          </Link>
                        )}
                        <ViatgerFirma
                          estanciaId={estancia.id}
                          viatgerId={ev.id}
                          signatura={ev.signatura ? { data: ev.signatura.data, hora: ev.signatura.hora, refusaComercial: ev.signatura.refusaComercial, autoritzaComercialAltres: ev.signatura.autoritzaComercialAltres } : null}
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
                      <Dl label="Email" value={h.email} wide />
                      <Dl label="Telèfon" value={h.telefon} />
                      <Dl
                        label="Adreça"
                        value={[h.adreca, h.codiPostal, h.municipi ?? h.localitat].filter(Boolean).join(', ')}
                        wide
                      />
                      <Dl label="Parentesc" value={ev.parentesc ? PARENTESC_LABELS[ev.parentesc] : '—'} />
                    </dl>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          {/* Bugaderia / neteja d'aquesta estada (articles a netejar) */}
          {canWrite && <BugaderiaPanel estanciaId={estancia.id} />}

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
                  periodes: c.periodes.map((p) => ({
                    dataInici: p.dataInici.toISOString(),
                    dataFi: p.dataFi.toISOString(),
                    import: Number(p.import),
                  })),
                }))}
                fiances={estancia.diposits.map((d) => ({
                  id: d.id,
                  import: Number(d.import),
                  data: d.data.toISOString(),
                  metode: d.metode,
                  estat: d.estat,
                  motiu: d.motiu,
                  notes: d.notes ?? null,
                  observacions: d.observacions ?? null,
                  facturaId: d.facturaId ?? null,
                  facturaNumero: d.factura?.numero ?? null,
                  periodes: d.periodes.map((p) => ({
                    dataInici: p.dataInici.toISOString(),
                    dataFi: p.dataFi.toISOString(),
                    import: Number(p.import),
                  })),
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
                habitacioNom={estancia.habitacio?.nom ?? null}
                numViatgers={estancia.numViatgers ?? null}
                habitacioOpcions={(() => {
                  // Habitació real + habitacions "separades" dels viatgers (papers).
                  const separats = new Map<string, number>();
                  estancia.viatgers.forEach((v) => {
                    const nom = v.habitacioSeparada?.nom;
                    if (nom) separats.set(nom, (separats.get(nom) ?? 0) + 1);
                  });
                  const nSeparats = [...separats.values()].reduce((a, b) => a + b, 0);
                  return [
                    {
                      nom: estancia.habitacio?.nom ?? null,
                      persones: Math.max(estancia.viatgers.length - nSeparats, 0) || (estancia.numViatgers ?? 1),
                    },
                    ...[...separats.entries()].map(([nom, persones]) => ({ nom, persones })),
                  ];
                })()}
                dataEntrada={estancia.dataEntrada?.toISOString() ?? null}
                dataSortida={estancia.dataSortida?.toISOString() ?? null}
                pagaments={estancia.cobraments.map((c) => ({
                  id: c.id,
                  import: Number(c.import),
                  descripcio: c.descripcio,
                  metode: c.metode,
                  data: c.data.toISOString(),
                  facturaId: c.facturaId,
                }))}
                fiances={estancia.diposits.map((d) => ({
                  id: d.id,
                  import: Number(d.import),
                  notes: d.notes ?? null,
                  metode: d.metode,
                  data: d.data.toISOString(),
                  estat: d.estat,
                  facturaId: d.facturaId ?? null,
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
                esAmpliacio={!!estancia.origen}
                contracte={estancia.numContracte ? `${estancia.numContracte}/${estancia.anyContracte}` : null}
                enviaments={estancia.enviaments.map((e) => ({
                  id: e.id,
                  estat: e.estat,
                  fitxerNom: e.fitxerNom,
                  seq: e.seq,
                  dataEnviament: e.dataEnviament ? e.dataEnviament.toISOString() : null,
                  codiValidacio: e.codiValidacio,
                  numRegistre: e.numRegistre,
                  errorMsg: formataRebuigMossos(e.errorMsg) || null,
                }))}
              />
            </CardBody>
          </Card>

          {/* Missatges a l'hoste (benvinguda WhatsApp / gràcies + ressenya) */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-600" />
              <CardTitle>Missatges a l’hoste</CardTitle>
            </CardHeader>
            <CardBody>
              <EmailsPanel
                estanciaId={estancia.id}
                titularNom={titular ? titular.nom : ''}
                titularEmail={titular?.email ?? null}
                titularTelefon={titular?.telefon ?? null}
                habitacioNom={estancia.habitacio?.nom ?? null}
                dataSortida={estancia.dataSortida?.toISOString() ?? ''}
                idioma={estancia.idioma ?? 'ca'}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
