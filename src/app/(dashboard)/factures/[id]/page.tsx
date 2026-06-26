import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, Printer, FileText, ShieldAlert } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CobramentActions } from '@/components/factura/cobrament-actions';
import { CobramentsList } from '@/components/factura/cobraments-list';
import { ToggleEstatFactura } from '@/components/factura/toggle-estat-factura';
import { LiniesCard } from '@/components/factura/linies-card';
import { EliminarFactura } from '@/components/factura/eliminar-factura';
import { formatEur } from '@/lib/utils';
import { VERIFACTU_LLEGENDA } from '@/lib/verifactu/software';

const METODE_LABEL: Record<string, string> = {
  EFECTIU: 'Efectiu', TARGETA: 'Targeta', TRANSFERENCIA: 'Transferència',
  BIZUM: 'Bizum', ALTRES: 'Altres',
};
const FIANCA_ESTAT_LABEL: Record<string, string> = {
  EN_CUSTODIA: 'En custòdia', TORNAT: 'Tornat', RETINGUT: 'Retingut (ingrés)',
};

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  RECIBO: 'Recibo',
  FACTURA: 'Factura fiscal',
  FACTURA_SIMPLIFICADA: 'Factura simplificada (F2)',
};

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      cobraments: { orderBy: { data: 'asc' } },
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
          diposits: { orderBy: { data: 'asc' } },
        },
      },
      verifactu: true,
    },
  });
  if (!factura) notFound();

  const titular = factura.estancia.viatgers[0]?.huesped;
  const cobrat = factura.cobraments.reduce((a, c) => a + Number(c.import), 0);
  const base = Number(factura.base);
  const iva = Number(factura.iva);
  const total = Number(factura.total);
  const pendent = Math.max(0, total - cobrat);

  // Derivats per a l'edició: el % d'IVA i la tassa es conserven en editar línies.
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;
  const tasaTotal = round2(total - base - iva);
  // Només els rebuts són editables; una factura fiscal (Veri*Factu) no.
  const editable = factura.tipusDocument === 'RECIBO' && !factura.verifactu;

  const qrDataUrl = factura.verifactu
    ? await QRCode.toDataURL(factura.verifactu.qrUrl, { width: 160, margin: 1 })
    : null;

  return (
    <div>
      <BackLink fallback="/factures">Facturació</BackLink>
      <PageHeader
        title={`Factura ${factura.numero}`}
        subtitle={titular ? `${titular.nom} ${titular.cognom1}` : undefined}
        actions={
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{DOC_LABEL[factura.tipusDocument] ?? factura.tipusDocument}</Badge>
              <Badge tone={factura.estat === 'COBRADA' ? 'success' : 'warning'}>
                {factura.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
              </Badge>
            </div>
            {/* Fila 1: amb fiança (amber) */}
            <div className="flex items-center gap-2">
              <Link
                href={`/imprimir/factura/${factura.id}?fianca=true`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                <ShieldCheck className="h-4 w-4" /> Factura fiscal amb fiança
              </Link>
              <Link
                href={`/imprimir/factura-simple/${factura.id}?custodia=true`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                <ShieldAlert className="h-4 w-4" /> Factura simple amb fiança
              </Link>
              <EliminarFactura
                id={factura.id}
                numero={factura.numero}
                redirectTo={`/estancies/${factura.estanciaId}`}
                teVerifactu={!!factura.verifactu}
              />
            </div>
            {/* Fila 2: sense fiança (muted) */}
            <div className="flex items-center gap-2">
              <Link
                href={`/imprimir/factura/${factura.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" /> Factura fiscal
              </Link>
              <Link
                href={`/imprimir/factura-simple/${factura.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" /> Factura simple
              </Link>
            </div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiniesCard
            facturaId={factura.id}
            linies={factura.linies.map((l) => ({
              id: l.id,
              concepte: l.concepte,
              descripcio: l.descripcio,
              import: Number(l.import),
            }))}
            base={base}
            iva={iva}
            total={total}
            ivaPercent={ivaPercent}
            tasaTotal={tasaTotal}
            editable={editable}
          />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Cobraments</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cobrat</span>
                <span>{formatEur(cobrat)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Pendent</span>
                <span className={pendent > 0 ? 'text-amber-600' : 'text-green-600'}>
                  {formatEur(pendent)}
                </span>
              </div>

              <CobramentsList
                cobraments={factura.cobraments.map((c) => ({
                  id: c.id,
                  metode: c.metode,
                  import: Number(c.import),
                  data: c.data,
                }))}
              />

              {factura.estancia.diposits.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-1">
                  <p className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Fiances
                  </p>
                  {factura.estancia.diposits.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        {d.notes ?? 'Fiança'} · {METODE_LABEL[d.metode] ?? d.metode}
                        {d.data && ` · ${d.data.toLocaleDateString('ca-ES', { day:'2-digit', month:'2-digit', year:'numeric' })}`}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatEur(Number(d.import))}
                        <span className="text-xs text-amber-600">{FIANCA_ESTAT_LABEL[d.estat] ?? d.estat}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <ToggleEstatFactura facturaId={factura.id} estat={factura.estat} />

              <CobramentActions
                facturaId={factura.id}
                pendent={pendent}
                cobrat={cobrat}
                estat={factura.estat}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {factura.verifactu && qrDataUrl && (
        <Card className="mt-6 border-brand-200">
          <CardHeader className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            <CardTitle>Registre Veri*Factu (AEAT)</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-6 sm:flex-row">
            <div className="shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR de cotejo AEAT" width={160} height={160} className="rounded-lg border border-slate-200" />
              <p className="mt-2 max-w-40 text-[11px] text-slate-500">{VERIFACTU_LLEGENDA}</p>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-slate-400">Núm. sèrie factura</dt>
                <dd>{factura.verifactu.numSerieFactura}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Tipus (AEAT)</dt>
                <dd>{factura.verifactu.tipusFactura}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Data/hora generació</dt>
                <dd className="text-xs">{factura.verifactu.fechaHoraHuso}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Estat</dt>
                <dd>{factura.verifactu.estat}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase text-slate-400">Huella (SHA-256)</dt>
                <dd className="break-all font-mono text-xs">{factura.verifactu.huella}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase text-slate-400">Huella anterior (encadenament)</dt>
                <dd className="break-all font-mono text-xs text-slate-500">
                  {factura.verifactu.huellaAnterior || '— (primer registre)'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
