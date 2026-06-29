import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer, FileText, ShieldCheck, Trash2, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { ToggleEstatFactura } from '@/components/factura/toggle-estat-factura';
import { LiniesCard } from '@/components/factura/linies-card';
import { EliminarFactura } from '@/components/factura/eliminar-factura';
import { EditarNumeroFactura } from '@/components/factura/editar-numero-factura';
import { formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA: 'Factura fiscal',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
};

function fmtDate(d: Date) {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
          habitacio: { select: { nom: true } },
        },
      },
      verifactu: true,
    },
  });
  if (!factura) notFound();

  const titular = factura.estancia.viatgers[0]?.huesped;
  const base = Number(factura.base);
  const iva = Number(factura.iva);
  const total = Number(factura.total);

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;
  const tasaTotal = round2(total - base - iva);
  const editable = !factura.verifactu;

  const cobrada = factura.estat === 'COBRADA';

  return (
    <div className="space-y-6">
      <BackLink fallback="/factures">Facturació</BackLink>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Capçalera de la factura */}
          <div className="space-y-1">
            <EditarNumeroFactura facturaId={factura.id} numero={factura.numero} />
            {titular && (
              <p className="text-base text-slate-500 font-medium">
                {titular.nom} {titular.cognom1} {titular.cognom2 ?? ''}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>{DOC_LABEL[factura.tipusDocument] ?? factura.tipusDocument}</span>
              {factura.estancia.habitacio && (
                <>
                  <span>·</span>
                  <span>Hab. {factura.estancia.habitacio.nom}</span>
                </>
              )}
              <span>·</span>
              <span>{fmtDate(factura.data)}</span>
            </div>
          </div>

          {/* Línies */}
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

        {/* ── Barra lateral ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Estat + total */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Estat</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cobrada ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {cobrada
                    ? <><CheckCircle className="h-3.5 w-3.5" /> Cobrada</>
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

          {/* Imprimir */}
          <Card>
            <CardBody className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Imprimir</p>

              {/* Amb fiança */}
              <div className="space-y-1.5">
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Amb fiança inclosa
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/imprimir/factura-simple/${factura.id}?custodia=true`}
                    target="_blank"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  >
                    <FileText className="h-3.5 w-3.5" /> Simple
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                  <Link
                    href={`/imprimir/factura/${factura.id}?fianca=true`}
                    target="_blank"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  >
                    <Printer className="h-3.5 w-3.5" /> Fiscal
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </div>
              </div>

              {/* Sense fiança */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">Sense fiança</p>
                <div className="flex gap-2">
                  <Link
                    href={`/imprimir/factura-simple/${factura.id}`}
                    target="_blank"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5" /> Simple
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                  <Link
                    href={`/imprimir/factura/${factura.id}`}
                    target="_blank"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Printer className="h-3.5 w-3.5" /> Fiscal
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </div>
              </div>
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

          {/* Eliminar */}
          <div className="border-t border-slate-100 pt-2">
            <EliminarFactura
              id={factura.id}
              numero={factura.numero}
              redirectTo={`/estancies/${factura.estanciaId}`}
              teVerifactu={!!factura.verifactu}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
