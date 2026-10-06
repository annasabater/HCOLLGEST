import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle, Clock, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { habitacioLlibre } from '@/lib/habitacio-llibre';
import { Card, CardBody } from '@/components/ui/card';
import { ToggleEstatFactura } from '@/components/factura/toggle-estat-factura';
import { LiniesCard } from '@/components/factura/linies-card';
import { EliminarFactura } from '@/components/factura/eliminar-factura';
import { EditarNumeroFactura } from '@/components/factura/editar-numero-factura';
import { FiancaTogglePrint } from '@/components/factura/fianca-toggle-print';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import { formatEur } from '@/lib/utils';
import { estatFacturaLabel } from '@/lib/factura-display';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date) {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      cobraments: { select: { id: true, import: true, metode: true } },
      diposits: { select: { id: true, import: true, metode: true, notes: true, estat: true } },
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true, habitacioSeparada: { select: { nom: true } } } },
          habitacio: { select: { nom: true } },
        },
      },
      verifactu: true,
    },
  });
  if (!factura) notFound();

  const teFianca = factura.diposits.length > 0;
  const paymentsVinculats = factura.cobraments.map((c) => ({
    id: c.id,
    import: Number(c.import),
    label: METODE_COBRAMENT_LABELS[c.metode],
  }));
  const fiancesVinculades = factura.diposits.map((d) => ({
    id: d.id,
    import: Number(d.import),
    label: d.notes ?? METODE_COBRAMENT_LABELS[d.metode],
  }));

  const titular = factura.estancia.viatgers[0]?.huesped;
  const base = Number(factura.base);
  const iva = Number(factura.iva);
  const total = Number(factura.total);

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;
  const tasaTotal = round2(total - base - iva);
  const editable = !factura.verifactu;
  const cobrada = factura.estat === 'COBRADA';

  // Document de dipòsit: el total comptable és 0; l'import és el del dipòsit.
  const esDiposit = factura.esDiposit;
  const importDiposit = factura.diposits.length > 0
    ? factura.diposits.reduce((a, d) => a + Number(d.import), 0)
    : factura.linies.reduce((a, l) => a + Number(l.import), 0);
  const estatDiposit = factura.diposits[0]?.estat ?? 'EN_CUSTODIA';
  const ESTAT_DIPOSIT: Record<string, string> = { EN_CUSTODIA: 'En custòdia', TORNAT: 'Tornat', RETINGUT: 'Retingut' };

  return (
    <div className="space-y-6">
      <BackLink fallback="/factures">Facturació</BackLink>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Capçalera */}
          <div className="space-y-1">
            <EditarNumeroFactura facturaId={factura.id} numero={factura.numero} />
            {titular && (
              <p className="text-base text-slate-500 font-medium">
                {titular.nom} {titular.cognom1} {titular.cognom2 ?? ''}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-400">
              {habitacioLlibre(factura.estancia) && (
                <>
                  <span>Hab. {habitacioLlibre(factura.estancia)}</span>
                  <span>·</span>
                </>
              )}
              <span>{fmtDate(factura.data)}</span>
            </div>
          </div>

          {esDiposit && (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    <ShieldCheck className="h-3.5 w-3.5" /> Document de dipòsit
                  </span>
                  <span className="text-sm text-slate-500">Factura simplificada sense IVA · no és un ingrés</span>
                </div>
                {factura.linies.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                    <span className="font-medium text-slate-800">{l.descripcio}</span>
                    <span className="tabular-nums text-slate-800">{formatEur(Number(l.import))}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  L&apos;import, l&apos;etiqueta i l&apos;estat es canvien des del dipòsit, a «Pagaments i fiances» de l&apos;estada.
                  El document s&apos;actualitza sol.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Línies */}
          {!esDiposit && <LiniesCard
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
            payments={paymentsVinculats}
            fiances={fiancesVinculades}
          />}

          {/* Eliminar */}
          <div className="pt-2">
            <EliminarFactura
              id={factura.id}
              numero={factura.numero}
              redirectTo={`/estancies/${factura.estanciaId}`}
              teVerifactu={!!factura.verifactu}
            />
          </div>
        </div>

        {/* ── Barra lateral ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Estat + total */}
          {esDiposit ? (
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Dipòsit</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> {ESTAT_DIPOSIT[estatDiposit] ?? 'En custòdia'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm text-slate-500">Total dipòsit</span>
                  <span className="text-xl font-semibold text-slate-900">{formatEur(importDiposit)}</span>
                </div>
                <p className="text-xs text-slate-500">Base 0,00 € · sense IVA. No compta com a ingrés.</p>
              </CardBody>
            </Card>
          ) : (
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Estat</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cobrada ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {cobrada
                    ? <><CheckCircle className="h-3.5 w-3.5" /> {estatFacturaLabel(factura.estat, total)}</>
                    : <><Clock className="h-3.5 w-3.5" /> Pendent</>}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-semibold text-slate-900">{formatEur(total)}</span>
              </div>
              <ToggleEstatFactura facturaId={factura.id} estat={factura.estat} />
            </CardBody>
          </Card>
          )}

          {/* Imprimir amb toggle fiança */}
          <Card>
            <CardBody>
              {esDiposit ? (
                <a
                  href={`/imprimir/factura-simple/${factura.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm text-slate-600 hover:text-brand-700"
                >
                  <span>Obrir / imprimir el document</span>
                  <FileText className="h-4 w-4" />
                </a>
              ) : (
                <FiancaTogglePrint
                  facturaId={factura.id}
                  fiancaInclosa={factura.fiancaInclosa}
                  teFianca={teFianca}
                />
              )}
            </CardBody>
          </Card>

          {/* Estada */}
          <Card>
            <CardBody>
              <Link
                href={`/estancies/${factura.estanciaId}`}
                className="flex items-center justify-between text-sm text-slate-600 hover:text-brand-700"
              >
                <span>Veure estada</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  );
}
